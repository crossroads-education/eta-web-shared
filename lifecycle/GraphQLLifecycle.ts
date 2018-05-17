/// <reference path="../def/join-monster.d.ts" />
import * as JoinMonster from "../def/join-monster";
import * as eta from "@eta/eta";
import * as db from "@eta/db";
import * as express from "express";
import * as graphql from "graphql";
import * as expressGraphQL from "express-graphql";
import * as orm from "typeorm";
import joinMonster from "join-monster";

const BOOLEAN_TYPES = ["boolean", "bool", "Boolean"];
const FLOAT_TYPES = ["decimal", "numeric", "real", "double precision", "float4", "float8", "money"];
const INT_TYPES = ["int", "int2", "int4", "int8", "integer", "smallint", "bigint", "Number"];

export default class GraphQLLifecycle extends eta.LifecycleHandler {
    static middleware: expressGraphQL.Middleware;

    register() {
        this.app.on("server:middleware:before", this.setupGraphQL.bind(this));
    }

    async setupGraphQL() {
        const types: JoinMonster.GraphQLObjectType[] = orm.getConnection("localhost").entityMetadatas.map(entity => new JoinMonster.GraphQLObjectType({
            name: entity.name,
            sqlTable: `${entity.tableName}`,
            uniqueKey: entity.primaryColumns.map(c => `${c.databaseName}`),
            fields: () => eta.array.mapObject(entity.ownColumns.filter(c => c.relationMetadata === undefined).map<{
                key: string,
                value: JoinMonster.GraphQLFieldConfig<any, any, any>
            }>(col => {
                const columnType = typeof(col.type) === "string" ? col.type : col.type.name;
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
                if (!col.isNullable) type = new graphql.GraphQLNonNull(type);
                return {
                    key: col.propertyName,
                    value: {
                        type,
                        sqlColumn: `${col.databaseName}`
                    }
                };
            }).concat(entity.ownColumns.filter(c => c.relationMetadata !== undefined).map<{
                key: string,
                value: JoinMonster.GraphQLFieldConfig<any, any, any>
            }>(col => {
                const otherType = types.find(t => t.name === col.relationMetadata.inverseEntityMetadata.name);
                let joinGenerator: JoinMonster.JoinGenerator;
                // console.log(entity.name, otherType.name, col.propertyName, col.relationMetadata.isOwning, col.databaseName, col.referencedColumn.databaseName);
                if (col.relationMetadata.isOwning) {
                    joinGenerator = (current, target) => `${current}."${col.databaseName}" = ${target}."${col.referencedColumn.databaseName}"`;
                } else {
                    joinGenerator = (current, target) => `${target}."${col.referencedColumn.databaseName}" = ${current}."${col.databaseName}"`;
                }
                return {
                    key: col.propertyName,
                    value: {
                        type: col.relationMetadata.relationType === "one-to-many" ? new graphql.GraphQLList(otherType) : otherType,
                        sqlJoin: joinGenerator
                    }
                };
            })))
        }));
        const query = new graphql.GraphQLObjectType({
            name: "RootQuery",
            fields: eta.array.mapObject(types.map(type => ({
                key: type.name,
                value: {
                    type: new graphql.GraphQLList(type),
                    args: { },
                    resolve: (_: any, __: any, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                        if (!this.checkPermissions(req, ["GraphQL/" + type.name + "/Read"])) {
                            throw new graphql.GraphQLError("Not allowed to access " + type.name, info.fieldNodes[0]);
                        }
                        return joinMonster(info, {}, sql =>
                            orm.getConnection(req.hostname).query(sql)
                        );
                    }
                }
            })))
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
