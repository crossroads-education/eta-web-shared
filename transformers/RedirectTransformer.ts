import * as express from "express";
import * as fs from "fs-extra";
import * as eta from "../eta";

export default class RedirectTransformer extends eta.IRequestTransformer {
    public async onRequest(): Promise<void> {
        let redirects: {[key: string]: string} = {};
        this.config.modules().forEach(m =>
            redirects = eta._.defaults(this.config.buildToObject(`modules.${m}.css.`), redirects));
        const redirectUrl: string = redirects[this.req.mvcPath];
        if (redirectUrl) {
            this.redirect(redirectUrl);
        }
    }
}
