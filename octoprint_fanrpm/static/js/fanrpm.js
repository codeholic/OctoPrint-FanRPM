$(function() {
    function FanRPMViewModel(parameters) {
        var self = this;

        self.settings = parameters[0];
        self.currentRPM = ko.observable(0);
        self.rpmHistory = ko.observableArray([]);
        self.maxHistory = 60;

        // Format RPM with thousands separator
        self.formattedRPM = ko.pureComputed(function() {
            return self.currentRPM().toLocaleString();
        });

        // Status indicator
        self.rpmStatus = ko.pureComputed(function() {
            var rpm = self.currentRPM();
            if (rpm === 0) return "danger";
            if (rpm < 500) return "warning";
            return "success";
        });

        self.statusText = ko.pureComputed(function() {
            var rpm = self.currentRPM();
            if (rpm === 0) return "No Signal";
            if (rpm < 500) return "Low RPM";
            return "OK";
        });

        // Statistics
        self.averageRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return 0;
            var sum = history.reduce(function(a, b) { return a + b; }, 0);
            return Math.round(sum / history.length);
        });

        self.minRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return 0;
            return Math.min.apply(null, history);
        });

        self.maxRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return 0;
            return Math.max.apply(null, history);
        });

        // Handle messages from plugin
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin !== "fanrpm") return;
            
            if (data.rpm !== undefined) {
                self.currentRPM(data.rpm);
                
                // Update history
                self.rpmHistory.push(data.rpm);
                if (self.rpmHistory().length > self.maxHistory) {
                    self.rpmHistory.shift();
                }
            }
        };

        // Request initial RPM
        self.requestRPM = function() {
            $.ajax({
                url: API_BASEURL + "plugin/fanrpm",
                type: "GET",
                dataType: "json",
                success: function(response) {
                    if (response.rpm !== undefined) {
                        self.currentRPM(response.rpm);
                    }
                }
            });
        };

        // Request RPM on startup
        self.onStartup = function() {
            self.requestRPM();
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: FanRPMViewModel,
        dependencies: ["settingsViewModel"],
        elements: ["#sidebar_plugin_fanrpm"]
    });
});
