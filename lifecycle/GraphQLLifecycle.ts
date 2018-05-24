import * as eta from "@eta/eta";
import * as express from "express";
import * as graphql from "graphql";
import * as expressGraphQL from "express-graphql";
import * as orm from "typeorm";

const BOOLEAN_TYPES = ["boolean", "bool", "Boolean"];
const FLOAT_TYPES = ["decimal", "numeric", "real", "double precision", "float4", "float8", "money"];
const INT_TYPES = ["int", "int2", "int4", "int8", "integer", "smallint", "bigint", "Number"];

type AuthQueryCallback<Query> = (query: Query, req: express.Request) => Promise<typeof query>;

interface GraphQLType<Entity = any> {
    entity: orm.EntityMetadata;
    type: graphql.GraphQLObjectType;
    auth: {
        // can't do a WHERE on create, so we have to check more generically
        create: ((req: express.Request, attempt: Partial<Entity>) => Promise<boolean>) | undefined;
        delete: AuthQueryCallback<orm.DeleteQueryBuilder<Entity>> | undefined;
        read: AuthQueryCallback<orm.SelectQueryBuilder<Entity>> | undefined;
        update: AuthQueryCallback<orm.UpdateQueryBuilder<Entity>> | undefined;
    };
}

export default class GraphQLLifecycle extends eta.LifecycleHandler {
    static middleware: expressGraphQL.Middleware;

    register() {
        this.app.on("server:middleware:before", this.setupGraphQL.bind(this));
    }

    async setupGraphQL() {
        const types: GraphQLType[] = orm.getConnection("localhost").entityMetadatas
            .filter(e => e.tableType === "regular")
            .map(entity => ({
                entity,
                auth: {
                    create: (<any>entity.target)[Reflect.getMetadata("graphql.create", entity.target)],
                    delete: (<any>entity.target)[Reflect.getMetadata("graphql.delete", entity.target)],
                    read: (<any>entity.target)[Reflect.getMetadata("graphql.read", entity.target)],
                    update: (<any>entity.target)[Reflect.getMetadata("graphql.update", entity.target)]
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
                    fields: eta.array.mapObject(types.map(type => ({
                        key: type.type.name,
                        value: this.setupQueryType(type)
                    })))
                }),
                mutation: new graphql.GraphQLObjectType({
                    name: "Mutation",
                    fields: eta.array.mapObject(types.map(type => ({
                        key: "create" + type.type.name,
                        value: this.setupCreateType(type)
                    })).concat(types.map(type => ({
                        key: "update" + type.type.name,
                        value: this.setupUpdateType(type)
                    }))))
                })
            }),
            graphiql: true
        });
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
                        .getRepository(type.entity.tableName)
                        .createQueryBuilder(), req);
                    if (args.filter !== undefined) {
                        query.andWhere(new orm.Brackets(qb => {
                            Object.keys(args.filter).map((col, index) => {
                                qb.orWhere(`${type.entity.tableName}."${col}" = :arg${index}`, { ["arg" + index]: args.filter[col] });
                            });
                        }));
                    }
                    info.fieldNodes[0].selectionSet.selections
                        .filter(s => (s as graphql.FieldNode).selectionSet !== undefined)
                        .forEach(s => this.joinQuery(query, s as graphql.FieldNode, type.entity.tableName));
                    return query.getMany();
                } catch (err) {
                    eta.logger.error(err); // GraphQL gives very poor error stacktraces by default
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
                if (!await type.auth.create(req, args)) {
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
                const query = await type.auth.update(orm.getConnection(req.hostname)
                    .getRepository(type.entity.target)
                    .createQueryBuilder().update(), req);
                const columns = type.entity.ownColumns.filter(c => c.propertyName in args);
                query.returning(columns.filter(c => c.isGenerated).map(c => c.databaseName));
                query.andWhere(new orm.Brackets(qb => {
                    columns.filter(c => c.isGenerated).forEach((col, index) =>
                        qb.orWhere(`"${col.databaseName}" = :arg${index}`, { ["arg" + index]: args[col.propertyName] }));
                    return qb;
                }));
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
