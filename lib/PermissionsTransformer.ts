import * as eta from "@eta/eta";

const PermissionsTransformer = (prefix: string): ClassDecorator => {
    return (target: any) => {
        eta.object.recursiveKeys(target).forEach(keys => {
            const item = keys.slice(0, -1).reduce((p, v) => p[v], target);
            if (typeof(item[keys[keys.length - 1]]) !== "string") return;
            item[keys[keys.length - 1]] = prefix + keys.join("/");
        });
    };
};

export default PermissionsTransformer;
