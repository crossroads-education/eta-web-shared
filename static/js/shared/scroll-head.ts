interface JQuery {
    /**
     * Creates a sticky header for table `this`
     * Table header is cloned and given fixed position
     */
    scrollHead(): JQuery;
}

(function($: JQueryStatic) {
    $.fn.scrollHead = function(this: JQuery): any {
        return $.each(this, () => {
            const tableOffset: number = this.offset().top;
            const head: JQuery = this.find("thead").clone();
            const fixedHead: JQuery = $("<table>").append(head);
            fixedHead.prop("id", "fixed-head");
            fixedHead.addClass("col-xs-12 schedule-container");
            const fixedHeadContainer: JQuery = $("<div>").append(fixedHead);
            fixedHeadContainer.prop("id", "fixed-head-container");
            fixedHeadContainer.addClass("row");
            $("#body").append(fixedHeadContainer);
            $(document.body).trigger("scrollHead.loaded");
            $(window).on("scroll", () => {
                const $window = $(window);
                const offset: number = $window.scrollTop();
                if (offset >= tableOffset && fixedHeadContainer.is(":hidden")) {
                    fixedHeadContainer.show();
                } else if (offset < tableOffset) {
                    fixedHeadContainer.hide();
                }
            });
        });
    };
})(jQuery);
