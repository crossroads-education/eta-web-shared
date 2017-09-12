let config: SystemJSLoader.Config = {
    "baseURL": "/js/",
    "map": {
        "ace": "https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.8/ace.js",
        "autocomplete": "https://crossroads-cdn.s3.amazonaws.com/js/autocomplete.min.js",
        "bootstrap": "https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js",
        "bootstrap-datepicker": "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.6.4/js/bootstrap-datepicker.min.js",
        "bootstrap-editable": "https://cdnjs.cloudflare.com/ajax/libs/x-editable/1.5.1/bootstrap3-editable/js/bootstrap-editable.min.js",
        "bootstrap-slider": "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-slider/9.8.1/bootstrap-slider.min.js",
        "bootstrap-switch": "https://cdnjs.cloudflare.com/ajax/libs/bootstrap-switch/3.3.4/js/bootstrap-switch.min.js",
        "chart.js": "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.5.0/Chart.min.js",
        "d3-timer": "https://cdnjs.cloudflare.com/ajax/libs/d3-timer/1.0.6/d3-timer.min.js",
        "datatables.net": "https://cdn.datatables.net/1.10.13/js/jquery.dataTables.min.js",
        "datatables.net-bs": "https://cdn.datatables.net/1.10.13/js/dataTables.bootstrap.min.js",
        "datatables.net-buttons": "https://cdn.datatables.net/buttons/1.2.4/js/dataTables.buttons.min.js",
        "datatables.net-buttons-bs": "https://cdn.datatables.net/buttons/1.2.4/js/buttons.bootstrap.min.js ",
        "datatables.net-buttons-html5": "https://cdn.datatables.net/buttons/1.2.2/js/buttons.html5.min.js",
        "datatables.net-buttons-print": "https://cdn.datatables.net/buttons/1.2.2/js/buttons.print.min.js",
        "es6-shim": "https://cdnjs.cloudflare.com/ajax/libs/es6-shim/0.35.3/es6-shim.min.js",
        "handlebars": "https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.0.10/handlebars.min.js",
        "jquery": "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js",
        "jquery-ui": "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js",
        "jquery-mousewheel": "https://cdnjs.cloudflare.com/ajax/libs/jquery-mousewheel/3.1.13/jquery.mousewheel.min.js",
        "jquery.scrollTo": "https://cdnjs.cloudflare.com/ajax/libs/jquery-scrollTo/2.1.0/jquery.scrollTo.min.js",
        "jquery-visible": "https://cdnjs.cloudflare.com/ajax/libs/jquery-visible/1.2.0/jquery.visible.min.js",
        "katex": "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/katex.min.js",
        "katex-autorender": "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.7.1/contrib/auto-render.min.js",
        "linq": "https://crossroads-cdn.s3.amazonaws.com/js/linq.min.js",
        "moment": "https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.18.1/moment.min.js",
        "patternomaly": "https://crossroads-cdn.s3.amazonaws.com/js/patternomaly.min.js",
        "please": "https://cdnjs.cloudflare.com/ajax/libs/pleasejs/0.4.2/Please.min.js",
        "select2": "https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.3/js/select2.min.js",
        "socket.io-client": "/socket.io/socket.io.js"
    }
};

SystemJS.config(config);
