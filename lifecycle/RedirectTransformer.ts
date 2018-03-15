import * as eta from "@eta/eta";

export default class RedirectTransformer extends eta.LifecycleHandler {
    private redirects: {[key: string]: string} = {};

    public register(): void {
        this.app.on("app:start", async () => {
            const config = this.app.configs.global;
            config.modules().forEach(m =>
                this.redirects = eta._.defaults(config.buildToObject(`modules.${m}.redirects.`), this.redirects));
        });
        this.app.on("request", async (http: eta.HttpRequest) => {
            const redirectUrl = this.redirects[http.req.mvcPath];
            if (redirectUrl) eta.IRequestHandler.redirect(http.res, redirectUrl);
        });
    }
}
