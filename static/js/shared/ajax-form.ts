/**
 * This helper allows Ajax submission of forms (instead of redirections for user)
 * with no additional javascript required.
 * Format:
 * div.ajax-form(data-action="/post/wherever", data-method="POST", data-success="#success-selector", data-error="#error-selector")
 *     input.form-control(name="whatever", type="text")
 *     button.btn.btn-success.btn-submit
 */

import HelperStatus from "helpers/HelperStatus.js";

// TODO wow this documentation is bad! fix it please (from Alex, to Alex)

/** Documents all available attributes for the form element */
interface FormAttributes {
    /** Selector for the success text element */
}

/** Documents all available attributes for form input elements */
interface ControlAttributes {
    /** The name this field will be posted to the server with. Can include a . to be used as part of an object. */
    "data-name": string;
    /** If true, this control must have a value before the form can be submitted */
    "data-required": boolean;
}

class AjaxForm {
    private form: JQuery;
    private inputs: {[key: string]: JQuery} = {};
    private status: HelperStatus;
    private method: string;
    private url: string;
    public constructor($form: JQuery) {
        this.form = $form;
        this.method = this.form.data("method");
        this.url = this.form.data("url");
        this.status = new HelperStatus(this.form.data("success") || "#success", this.form.data("error") || "#error");
        this.form.on("ajax-form.submit", (evt, params) => this.fireAjax(params));
    }

    private onSubmit(): void {
        const params: {[key: string]: any} = {};
        let canSubmit = true;
        this.form.find(".ajax-control").each((i, e) => {
            const propertyName: string = e.getAttribute("data-name");
            const value: any = $(e).val();
            if (e.hasAttribute("data-required") && !value) {
                canSubmit = false;
            }
            if (propertyName.includes(".")) {
                const [partialName, partialPropertyName] = propertyName.split(".");
                if (!params[partialName]) {
                    params[partialName] = {};
                }
                params[partialName][partialPropertyName] = value;
            }
        });
    }

    private fireAjax(params: {[key: string]: any}): void {

    }
}
function onFormSubmit(): void {

}

$(document).ready(() => {

});
