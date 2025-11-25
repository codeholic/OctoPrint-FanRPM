$(function() {
    function FanRPMViewModel(parameters) {
        var self = this;

        console.log("FanRPM: ViewModel constructor called");

        self.settings = parameters[0];
        self.currentRPM = ko.observable(0);
        self.rpmHistory = ko.observableArray([]);
        self.maxHistory = 60;
        self.minRPMTime = ko.observable(null);
        self.maxRPMTime = ko.observable(null);
        self.currentTime = ko.observable(new Date());

        // Format RPM with thousands separator
        self.formattedRPM = ko.pureComputed(function() {
            return self.currentRPM().toLocaleString();
        });

        // Status indicator
        self.rpmStatusClass = ko.pureComputed(function() {
            var rpm = self.currentRPM();
            if (rpm === 0) return "rpm-status-danger";
            if (rpm < 500) return "rpm-status-danger";
            if (rpm < 1000) return "rpm-status-warning";
            return "rpm-status-ok";
        });

        // Fan icon animation class
        self.fanIconClass = ko.pureComputed(function() {
            var rpm = self.currentRPM();
            if (rpm === 0) return "rpm-status-danger fan-spin-stop";
            if (rpm < 500) return "rpm-status-danger fan-spin-slow";
            if (rpm < 1000) return "rpm-status-warning fan-spin-warning";
            return "rpm-status-ok fan-spin-ok";
        });

        // Statistics
        self.averageRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return "0";
            var sum = history.reduce(function(a, b) { return a + b; }, 0);
            return Math.round(sum / history.length).toLocaleString();
        });

        self.minRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return "0";
            var minVal = Math.min.apply(null, history);
            return minVal.toLocaleString();
        });

        self.maxRPM = ko.pureComputed(function() {
            var history = self.rpmHistory();
            if (history.length === 0) return "0";
            var maxVal = Math.max.apply(null, history);
            return maxVal.toLocaleString();
        });

        // Helper function to format relative time
        function formatRelativeTime(date) {
            var now = new Date();
            var diffMs = now - date;
            var diffSecs = Math.floor(diffMs / 1000);
            var diffMins = Math.floor(diffSecs / 60);
            var diffHours = Math.floor(diffMins / 60);
            var diffDays = Math.floor(diffHours / 24);
            var diffWeeks = Math.floor(diffDays / 7);
            var diffMonths = Math.floor(diffDays / 30);
            var diffYears = Math.floor(diffDays / 365);

            if (diffSecs < 60) {
                return diffSecs + " second" + (diffSecs !== 1 ? "s" : "") + " ago";
            } else if (diffMins < 60) {
                return diffMins + " minute" + (diffMins !== 1 ? "s" : "") + " ago";
            } else if (diffHours < 24) {
                return diffHours + " hour" + (diffHours !== 1 ? "s" : "") + " ago";
            } else if (diffDays < 7) {
                return diffDays + " day" + (diffDays !== 1 ? "s" : "") + " ago";
            } else if (diffWeeks < 4) {
                return diffWeeks + " week" + (diffWeeks !== 1 ? "s" : "") + " ago";
            } else if (diffMonths < 12) {
                return diffMonths + " month" + (diffMonths !== 1 ? "s" : "") + " ago";
            } else {
                return diffYears + " year" + (diffYears !== 1 ? "s" : "") + " ago";
            }
        }

        self.minRPMTimeFormatted = ko.pureComputed(function() {
            var time = self.minRPMTime();
            if (!time) return "";
            // Access currentTime to trigger recomputation
            self.currentTime();
            return " (" + formatRelativeTime(time) + ")";
        });

        self.maxRPMTimeFormatted = ko.pureComputed(function() {
            var time = self.maxRPMTime();
            if (!time) return "";
            // Access currentTime to trigger recomputation
            self.currentTime();
            return " (" + formatRelativeTime(time) + ")";
        });

        self.minRPMTimeAbsolute = ko.pureComputed(function() {
            var time = self.minRPMTime();
            if (!time) return "";
            return time.toLocaleString();
        });

        self.maxRPMTimeAbsolute = ko.pureComputed(function() {
            var time = self.maxRPMTime();
            if (!time) return "";
            return time.toLocaleString();
        });

        // Handle messages from plugin
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin !== "fanrpm") return;

            console.log("FanRPM: Received message", data);

            if (data.rpm !== undefined) {
                self.currentRPM(data.rpm);

                // Update history
                var history = self.rpmHistory();
                self.rpmHistory.push(data.rpm);
                if (self.rpmHistory().length > self.maxHistory) {
                    self.rpmHistory.shift();
                }

                // Track min/max times
                var now = new Date();
                if (history.length === 0 || data.rpm <= Math.min.apply(null, history)) {
                    self.minRPMTime(now);
                }
                if (history.length === 0 || data.rpm >= Math.max.apply(null, history)) {
                    self.maxRPMTime(now);
                }
            }
        };

        // Request initial RPM
        self.requestRPM = function() {
            console.log("FanRPM: Requesting initial RPM");
            $.ajax({
                url: API_BASEURL + "plugin/fanrpm",
                type: "GET",
                dataType: "json",
                success: function(response) {
                    console.log("FanRPM: API response", response);
                    if (response.rpm !== undefined) {
                        self.currentRPM(response.rpm);
                    }
                },
                error: function(xhr, status, error) {
                    console.error("FanRPM: API error", status, error);
                }
            });
        };

        // Request RPM on startup
        self.onStartup = function() {
            console.log("FanRPM: ViewModel started");
            self.requestRPM();

            // Update current time every second to refresh relative timestamps
            setInterval(function() {
                self.currentTime(new Date());
            }, 1000);
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: FanRPMViewModel,
        dependencies: ["settingsViewModel"],
        elements: ["#sidebar_plugin_fanrpm"]
    });
});
