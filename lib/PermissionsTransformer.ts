import * as eta from "@eta/eta";

const PermissionsTransformer = (prefix: string): ClassDecorator => (target: any) => {
        eta.object.recursiveKeys(target).forEach(keys => {
            const item = keys.slice(0, -1).reduce((p, v) => p[v], target);
            const lastKey = keys[keys.length - 1];
            if (typeof(item[lastKey]) !== "string") return;
            item[lastKey] = prefix + keys.join("/");
        });
    };
};

export default PermissionsTransformer;
