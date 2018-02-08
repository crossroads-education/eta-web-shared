import * as express from "express";
import * as fs from "fs";
import * as eta from "../eta";

export default class CssTransformer extends eta.IRequestTransformer {

    public async beforeResponse(): Promise<void> {
        let redirects: {[key: string]: string} = {};
        this.config.modules().forEach(m =>
            redirects = eta._.defaults(this.config.buildToObject(`modules.${m}.css.`), redirects));
        const view: {[key: string]: any} = this.res.view;
        if (!view["css"]) view["css"] = [];
        const css: string[] = view["css"];
        for (let i = 0; i < css.length; i++) {
            if (css[i][0] === "@") {
                const name: string = css[i].substring(1);
                if (redirects[name]) {
                    css[i] = redirects[name];
                } else {
                    eta.logger.warn("CSS redirect " + name + " could not be found.");
                }
            }
        }
        view["css"] = css;
        view.defaultCssExists = this.server.app.staticFiles[`/css${this.req.mvcPath}.css`] !== undefined;
        this.res.view = view;
    }
}
