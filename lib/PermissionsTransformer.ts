import * as eta from "@eta/eta";

const PermissionsTransformer = (prefix: string): ClassDecorator => {
    return (target: any) => {
        eta.object.forEachPath(target, (path: string[], obj: any, key: string) => {
          if (typeof(obj[key]) !== "string") return;
          obj[key] = prefix + path.join("/");
        });
    };
};

export default PermissionsTransformer;
