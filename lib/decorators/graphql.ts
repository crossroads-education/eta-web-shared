export default class GraphQLDecorators {
    static read: MethodDecorator = (target, propertyKey) => {
        Reflect.defineMetadata("graphql.read", propertyKey, target);
    }
}
