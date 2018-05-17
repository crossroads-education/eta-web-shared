declare module "join-monster" {
    import * as graphql from "graphql";

    const resolver: (info: graphql.GraphQLResolveInfo, args: {}, worker: (sql: string) => Promise<any[]>) => Promise<any[]>;
    export default resolver;
}
