import * as graphql from "graphql";

export type JoinGenerator = (currentTable: string, targetTable: string, args: any) => string;

export interface GraphQLFieldConfig<A, B, C> extends graphql.GraphQLFieldConfig<A, B, C> {
    sqlColumn?: string;
    sqlJoin?: JoinGenerator;
    junction?: {
        sqlJoins: JoinGenerator[];
        sqlTable: string;
    };
}

export interface GraphQLFieldConfigMap<A, B> extends graphql.GraphQLFieldConfigMap<A, B> {
    [key: string]: GraphQLFieldConfig<A, B, { [argName: string]: any }>;
}

export interface GraphQLObjectTypeConfig<A, B> extends graphql.GraphQLObjectTypeConfig<A, B> {
    sqlTable: string;
    uniqueKey: string | string[];
    fields: graphql.Thunk<GraphQLFieldConfigMap<any, any>>;
}

export class GraphQLObjectType extends graphql.GraphQLObjectType {
    constructor(init: GraphQLObjectTypeConfig<any, any>) {
        super(init);
    }
}
