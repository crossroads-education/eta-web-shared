import * as eta from "@eta/eta";
import * as express from "express";
import * as graphql from "graphql";
import * as expressGraphQL from "express-graphql";
import * as orm from "typeorm";
import { CrudDecoratorOptions } from "../lib/decorators/graphql";

const BOOLEAN_TYPES = ["boolean", "bool", "Boolean"];
const FLOAT_TYPES = ["decimal", "numeric", "real", "double precision", "float4", "float8", "money"];
const INT_TYPES = ["int", "int2", "int4", "int8", "integer", "smallint", "bigint", "Number"];

type AuthQueryCallback<Entity> = (query: orm.SelectQueryBuilder<Entity>, req: express.Request) => Promise<typeof query>;

interface GraphQLType<Entity = any> {
    entity: orm.EntityMetadata;
    type: graphql.GraphQLObjectType;
    auth: {
        // can't do a WHERE on create, so we have to check more generically
        create: ((attempt: Partial<Entity>, req: express.Request) => Promise<boolean>) | undefined;
        delete: AuthQueryCallback<Entity> | undefined;
        read: AuthQueryCallback<Entity> | undefined;
        update: AuthQueryCallback<Entity> | undefined;
    };
}

export default class GraphQLLifecycle extends eta.LifecycleHandler {
    static middleware: expressGraphQL.Middleware;

    register() {
        this.app.on("server:middleware:before", this.setupGraphQL.bind(this));
    }

    async setupGraphQL() {
        const connection = orm.getConnection(Object.keys(this.app.configs).find(k => k !== "global"));
        const types: GraphQLType[] = connection.entityMetadatas
            .filter(e => e.tableType === "regular")
            .map(entity => ({
                entity,
                auth: {
                    create: this.buildAuthHandler(entity, "Create"),
                    delete: this.buildAuthHandler(entity, "Delete"),
                    read: this.buildAuthHandler(entity, "Read"),
                    update: this.buildAuthHandler(entity, "Update")
                },
                type: new graphql.GraphQLObjectType({
                    name: entity.name,
                    fields: () => eta.array.mapObject(entity.ownColumns
                        .filter(c => c.relationMetadata === undefined)
                        .map(col => ({
                            key: col.propertyName,
                            value: {
                                type: this.getTypeFromColumn(<any>col) as graphql.GraphQLObjectType | graphql.GraphQLList<any>
                            }
                        })).concat(entity.relations.map(relation => {
                            const otherType = types.find(t => t.entity.tableName === relation.inverseEntityMetadata.tableName);
                            return {
                                key: relation.propertyName,
                                value: {
                                    type: (relation.isOneToOne || relation.isManyToOne) ? otherType.type : new graphql.GraphQLList(otherType.type)
                                }
                            };
                        }))
                    )
                })
            })
        );
        GraphQLLifecycle.middleware = expressGraphQL({
            schema: new graphql.GraphQLSchema({
                query: new graphql.GraphQLObjectType({
                    name: "Query",
                    fields: eta.array.mapObject(types.filter(t => t.auth.read).map(type => ({
                        key: type.type.name,
                        value: this.setupQueryType(type)
                    })))
                }),
                mutation: new graphql.GraphQLObjectType({
                    name: "Mutation",
                    fields: eta.array.mapObject(types.filter(t => t.auth.create).map(type => ({
                        key: "create" + type.type.name,
                        value: this.setupCreateType(type)
                    })).concat(types.filter(t => t.auth.update).map(type => ({
                        key: "update" + type.type.name,
                        value: this.setupUpdateType(type)
                    }))))
                })
            }),
            graphiql: true
        });
    }

    private buildAuthHandler(entity: orm.EntityMetadata, type: "Create" | "Delete" | "Read" | "Update") {
        const callback = (entity.target as any)[Reflect.getMetadata("graphql." + type.toLowerCase(), entity.target)];
        if (!callback) return callback;
        const options: CrudDecoratorOptions = Reflect.getMetadata("graphql-options." + type.toLowerCase(), entity.target);
        if (!options.permission) return callback;
        const permission = options.permission === true ? `GraphQL/${entity.name}/${type}` : options.permission;
        return async (item: any, req: express.Request) => {
            const isAuthorized = req.session.user.hasCurrentPosition() && req.session.user.hasPermissions([permission]);
            if (!isAuthorized) return type === "Create" ? false : item.where(`"${item.alias}".id = -1`);
            return callback(item, req);
        };
    }

    private setupQueryType(type: GraphQLType): graphql.GraphQLFieldConfig<any, any, any> {
        const filter = {
            name: "filter",
            type: new graphql.GraphQLInputObjectType({
                name: "FilterArgs" + type.type.name,
                fields: eta.array.mapObject(type.entity.ownColumns.map(col => ({
                    key: col.propertyName,
                    value: {
                        type: this.getTypeFromColumn(<any>col, true)
                    }
                })))
            })
        };
        return {
            type: new graphql.GraphQLList(type.type),
            args: {
                filter
            },
            resolve: async (_: any, args: { filter: {[key: string]: any} }, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                if (type.auth.read === undefined) {
                    throw new graphql.GraphQLError("Entity " + type.type.name + " is not available for querying.", info.fieldNodes[0]);
                }
                try {
                    const query = await type.auth.read(orm.getConnection(req.hostname)
                        .getRepository(type.entity.target)
                        .createQueryBuilder(type.entity.tableName), req);
                    if (args.filter !== undefined) {
                        query.andWhere(new orm.Brackets(qb => {
                            Object.keys(args.filter).map((col, index) => {
                                const column = type.entity.ownColumns.find(c => c.propertyName === col);
                                qb.andWhere(`"${type.entity.tableName}"."${column.databaseName}" = :arg${index}`, { ["arg" + index]: args.filter[col] });
                            });
                            return qb;
                        }));
                    }
                    info.fieldNodes[0].selectionSet.selections
                        .filter(s => (s as graphql.FieldNode).selectionSet !== undefined)
                        .forEach(s => this.joinQuery(query, s as graphql.FieldNode, type.entity.tableName));
                    return query.getMany();
                } catch (err) {
                    console.error(err); // GraphQL gives very poor error stacktraces by default
                    throw err;
                }
            }
        };
    }

    private setupCreateType(type: GraphQLType): graphql.GraphQLFieldConfig<any, any, any> {
        return {
            type: type.type,
            args: eta.array.mapObject(type.entity.ownColumns.map(col => ({
                key: col.propertyName,
                value: {
                    type: this.getTypeFromColumn(<any>col, col.isPrimary)
                }
            }))),
            resolve: async (_: any, args: {[key: string]: any}, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                if (type.auth.create === undefined) {
                    throw new graphql.GraphQLError("Entity " + type.type.name + " is not available for creating.", info.fieldNodes[0]);
                }
                if (!await type.auth.create(args, req)) {
                    throw new graphql.GraphQLError("Cannot create entity of type " + type.type.name, info.fieldNodes[0]);
                }
                return orm.getConnection(req.hostname).getRepository(type.entity.target).save([args]).then(rows => rows[0]);
            }
        };
    }

    private setupUpdateType(type: GraphQLType): graphql.GraphQLFieldConfig<any, any, any> {
        return {
            type: type.type,
            args: eta.array.mapObject(type.entity.ownColumns.map(col => ({
                key: col.propertyName,
                value: {
                    type: this.getTypeFromColumn(<any>col, !col.isGenerated)
                }
            }))),
            resolve: async (_: any, args: {[key: string]: any}, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                if (type.auth.update === undefined) {
                    throw new graphql.GraphQLError("Entity " + type.type.name + " is not available for updating.", info.fieldNodes[0]);
                }
                const columns = type.entity.ownColumns.filter(c => c.propertyName in args);
                const repo = orm.getConnection(req.hostname).getRepository(type.entity.target);
                const idQuery = repo.createQueryBuilder(type.entity.tableName).select(type.entity.tableName + ".id", "id");
                await type.auth.update(idQuery, req);
                if (columns.some(c => c.isGenerated)) {
                    idQuery.andWhere(new orm.Brackets(qb => {
                        columns.filter(c => c.isGenerated).forEach((col, index) => {
                            qb.andWhere(`${type.entity.tableName}."${col.databaseName}" = :arg${index}`, { ["arg" + index]: args[col.propertyName] });
                        });
                        return qb;
                    }));
                }
                const ids = await idQuery.getRawMany().then(arr => arr.map(i => i.id));
                const query = repo.createQueryBuilder(type.entity.tableName).update()
                    .whereInIds(ids);
                query.returning(columns.filter(c => c.isGenerated).map(c => c.databaseName));
                query.set(eta.array.mapObject(columns.filter(c => !c.isGenerated).map(col => ({
                    key: col.propertyName,
                    value: args[col.propertyName]
                }))));
                return query.execute().then(r => r.raw[0]);
            }
        };
    }

    private joinQuery(query: orm.SelectQueryBuilder<any>, selection: graphql.FieldNode, prefix: string) {
        const newPrefix = prefix + "_" + selection.name.value;
        query.leftJoinAndSelect(prefix + "." + selection.name.value, newPrefix);
        selection.selectionSet.selections.forEach((sel: graphql.FieldNode) => {
            if (sel.selectionSet) this.joinQuery(query, sel, newPrefix);
        });
    }

    private getTypeFromColumn(col: orm.TableColumn, allowNull = false) {
        const columnType = typeof(col.type) === "string" ? col.type : (<any>col.type).name;
        let type: graphql.GraphQLType = (() => { switch (true) {
            case BOOLEAN_TYPES.includes(columnType):
                return graphql.GraphQLBoolean;
            case INT_TYPES.includes(columnType):
                return graphql.GraphQLInt;
            case FLOAT_TYPES.includes(columnType):
                return graphql.GraphQLFloat;
            default:
                return graphql.GraphQLString;
        } })();
        if (col.isArray || col.type === "simple-array") type = new graphql.GraphQLList(type);
        if (!allowNull && !col.isNullable) type = new graphql.GraphQLNonNull(type);
        return type;
    }
}
