import { expect } from "chai";
import PermissionsTransformer from "../../lib/PermissionsTransformer";

describe.only("PermissionsTransformer", () => {
    @PermissionsTransformer("Element/")
    class ElementPermission {
        static Analytics = {
            Query: {
                Advisor: "",
                Coach: "",
                Director: ""
            }
        };
    }

    it("should transform the permissions correctly", () => {
        expect(ElementPermission.Analytics.Query.Advisor).to.equal("Element/Analytics/Query/Advisor");
        expect(ElementPermission.Analytics.Query.Coach).to.equal("Element/Analytics/Query/Coach");
        expect(ElementPermission.Analytics.Query.Director).to.equal("Element/Analytics/Query/Director");
    });
});
