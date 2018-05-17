/// <reference path="../def/join-monster.d.ts" />
import * as JoinMonster from "../def/join-monster";
import * as eta from "@eta/eta";
import * as db from "@eta/db";
import * as express from "express";
import * as graphql from "graphql";
import * as expressGraphQL from "express-graphql";
import * as orm from "typeorm";
import * as pg from "pg";
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
        const types: {
            entity: orm.EntityMetadata;
            type: JoinMonster.GraphQLObjectType
        }[] = orm.getConnection("localhost").entityMetadatas.map(entity => ({ entity, type: new JoinMonster.GraphQLObjectType({
            name: entity.name,
            sqlTable: `${entity.tableName}`,
            uniqueKey: entity.primaryColumns.map(c => `${c.databaseName}`),
            fields: () => eta.array.mapObject(entity.ownColumns.filter(c => c.relationMetadata === undefined).map<{
                key: string,
                value: JoinMonster.GraphQLFieldConfig<any, any, any>
            }>(col => ({
                key: col.propertyName,
                value: {
                    type: this.getTypeFromColumn(<any>col),
                    sqlColumn: `${col.databaseName}`
                }
            })).concat(entity.ownColumns.filter(c => c.relationMetadata !== undefined).map<{
                key: string,
                value: JoinMonster.GraphQLFieldConfig<any, any, any>
            }>(col => {
                const otherType = types.find(t => t.entity.name === col.relationMetadata.inverseEntityMetadata.name);
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
                        type: col.relationMetadata.relationType === "one-to-many" ? new graphql.GraphQLList(otherType.type) : otherType.type,
                        sqlJoin: joinGenerator
                    }
                };
            })))
        })}));
        const query = new graphql.GraphQLObjectType({
            name: "RootQuery",
            fields: eta.array.mapObject(types.map(type => ({
                key: type.type.name,
                value: {
                    type: new graphql.GraphQLList(type.type),
                    args: eta.array.mapObject(type.entity.ownColumns.filter(c => c.relationMetadata === undefined).map(col => ({
                        key: col.propertyName,
                        value: {
                            // type: type.type.getFields()[c.propertyName].type
                            type: this.getTypeFromColumn(<any>col, true),
                        }
                    }))),
                    where: (table: string, args: {[key: string]: any}) => {
                        if (Object.keys(args).length === 0) return false;
                        return Object.keys(args).map(col =>
                            `${table}.${col} = ${typeof(args[col]) === "string" ? new pg.Client().escapeLiteral(args[col]) : args[col]}`
                        ).join(" OR ");
                    },
                    resolve: (_: any, __: any, req: express.Request, info: graphql.GraphQLResolveInfo) => {
                        if (!this.checkPermissions(req, ["GraphQL/" + type.type.name + "/Read"])) {
                            throw new graphql.GraphQLError("Not allowed to access " + type.type.name, info.fieldNodes[0]);
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
