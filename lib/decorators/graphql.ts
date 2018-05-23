export enum CrudType {
    Create = "create",
    Delete = "delete",
    Read = "read",
    Update = "update"
}

export default class GraphQLDecorators {
    static crud = (type: CrudType): MethodDecorator => (target, propertyKey) => {
        Reflect.defineMetadata("graphql." + type, propertyKey, target);
    };

    static create = GraphQLDecorators.crud(CrudType.Create);
    static delete = GraphQLDecorators.crud(CrudType.Delete);
    static read = GraphQLDecorators.crud(CrudType.Read);
    static update = GraphQLDecorators.crud(CrudType.Update);
}
