import * as eta from "@eta/eta";

export default class ViewTransformer extends eta.LifecycleHandler {
    public register(): void {
        this.app.on("request:pre-response", async (http: eta.HttpRequest) => {
            http.res.view.mvcPath = http.req.mvcPath;
            http.res.view.defaultCssExists = this.app.staticFiles[`/css${http.req.mvcPath}.css`] !== undefined;
        });
    }
}
