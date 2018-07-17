export enum CrudType {
    Create = "create",
    Delete = "delete",
    Read = "read",
    Update = "update"
}

export interface CrudDecoratorOptions {
    permission?: string | boolean;
}

export default class GraphQLDecorators {
    static crud = (type: CrudType) => (options?: CrudDecoratorOptions): MethodDecorator => (target, propertyKey) => {
        Reflect.defineMetadata("graphql." + type, propertyKey, target);
        Reflect.defineMetadata("graphql-options." + type, options || {}, target);
    };

    static create = GraphQLDecorators.crud(CrudType.Create);
    static delete = GraphQLDecorators.crud(CrudType.Delete);
    static read = GraphQLDecorators.crud(CrudType.Read);
    static update = GraphQLDecorators.crud(CrudType.Update);
}
