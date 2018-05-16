import * as eta from "@eta/eta";
import * as db from "@eta/db";
import * as express from "express";
import * as graphql from "graphql";
import * as expressGraphQL from "express-graphql";
import * as orm from "typeorm";

const BOOLEAN_TYPES: string[] = ["boolean", "bool", "Boolean"];
const FLOAT_TYPES: string[] = ["decimal", "numeric", "real", "double precision", "float4", "float8", "money"];
const INT_TYPES: string[] = ["int", "int2", "int4", "int8", "integer", "smallint", "bigint", "Number"];
const STRING_TYPES: string[] = ["character varying", "character", "varchar", "char", "text", "String"];

export default class GraphQLLifecycle extends eta.LifecycleHandler {
    static middleware: expressGraphQL.Middleware;

    register() {
        this.app.on("server:middleware:before", this.setupGraphQL.bind(this));
    }

    async setupGraphQL() {
        const types = orm.getConnection("localhost").entityMetadatas.map(entity => new graphql.GraphQLObjectType({
            name: entity.name,
            fields: () => eta.array.mapObject(entity.ownColumns.map(col => {
                const columnType = typeof(col.type) === "string" ? col.type : col.type.name;
                let type: graphql.GraphQLType = (() => { switch (true) {
                    case BOOLEAN_TYPES.includes(columnType):
                        return graphql.GraphQLBoolean;
                    case INT_TYPES.includes(columnType):
                        return graphql.GraphQLInt;
                    case STRING_TYPES.includes(columnType):
                        return graphql.GraphQLString;
                    case FLOAT_TYPES.includes(columnType):
                        return graphql.GraphQLFloat;
                    default:
                        return graphql.GraphQLBoolean;
                } })();
                if (!col.isNullable) type = new graphql.GraphQLNonNull(type);
                if (col.isArray) type = new graphql.GraphQLList(type);
                return {
                    key: col.propertyName,
                    value: {
                        type
                    }
                };
            }))
        }));
        const query = new graphql.GraphQLObjectType({
            name: "RootQuery",
            fields: eta.array.mapObject(types.map(type => <any>({
                key: type.name,
                value: {
                    type,
                    args: {
                        id: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) }
                    },
                    resolve: (_: any, args: { id: number; }, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                        if (!this.checkPermissions(req, ["GraphQL/" + type.name + "/Read"])) {
                            throw new graphql.GraphQLError("Not allowed to access " + type.name, info.fieldNodes[0]);
                        }
                        return orm.getConnection(req.hostname).getRepository(type.name).findOne(args.id);
                    }
                }
            })).concat(types.map(type => ({
                key: type.name + "s",
                value: {
                    type: new graphql.GraphQLList(type),
                    args: { },
                    resolve: (_: any, __: any, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                        if (!this.checkPermissions(req, ["GraphQL/" + type.name + "/Read"])) {
                            throw new graphql.GraphQLError("Not allowed to access " + type.name, info.fieldNodes[0]);
                        }
                        return orm.getConnection(req.hostname).getRepository(type.name).find();
                    }
                }
            }))))
        });
        GraphQLLifecycle.middleware = expressGraphQL({
            schema: new graphql.GraphQLSchema({
                query
            }),
            graphiql: true
        });
    }

    private checkPermissions(req: express.Request, permissions: string[]) {
        const connection = orm.getConnection(req.hostname);
        const user: db.User = <any>connection.getRepository(db.User).create(req.session.user);
        return user.hasPermissions(permissions);
    }
}
