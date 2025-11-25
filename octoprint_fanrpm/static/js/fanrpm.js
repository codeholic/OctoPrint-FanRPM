$(function() {
    function FanRPMViewModel(parameters) {
        var self = this;

        console.log("FanRPM: ViewModel constructor called");

        self.settings = parameters[0];
        self.currentRPM = ko.observable(0);

        // Rolling window for last 30 minutes (900 readings at 2s interval)
        self.rpmHistory = ko.observableArray([]);
        self.maxHistorySize = 900; // 30 minutes * 60 seconds / 2 second interval

        // Time window selection
        self.timeWindow = ko.observable("1min"); // "1min", "5min", "30min"

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

        // Get filtered data based on time window
        self.getFilteredData = function() {
            var history = self.rpmHistory();
            var window = self.timeWindow();
            var now = new Date();
            var cutoffTime;

            if (window === "1min") {
                cutoffTime = new Date(now - 60 * 1000);
            } else if (window === "5min") {
                cutoffTime = new Date(now - 5 * 60 * 1000);
            } else { // 30min
                cutoffTime = new Date(now - 30 * 60 * 1000);
            }

            return history.filter(function(entry) {
                return entry.time >= cutoffTime;
            });
        };

        // Statistics
        self.averageRPM = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            self.timeWindow(); // Track dependency

            if (filtered.length === 0) return "0";

            var sum = filtered.reduce(function(acc, entry) {
                return acc + entry.rpm;
            }, 0);

            return Math.round(sum / filtered.length).toLocaleString();
        });

        self.minRPM = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            self.timeWindow(); // Track dependency

            if (filtered.length === 0) return "0";

            var min = Math.min.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            return min.toLocaleString();
        });

        self.maxRPM = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            self.timeWindow(); // Track dependency

            if (filtered.length === 0) return "0";

            var max = Math.max.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            return max.toLocaleString();
        });

        // Status classes for statistics (only show color for warnings/errors)
        self.averageRPMStatusClass = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            if (filtered.length === 0) return "rpm-status-danger";

            var sum = filtered.reduce(function(acc, entry) {
                return acc + entry.rpm;
            }, 0);
            var avg = sum / filtered.length;

            if (avg === 0) return "rpm-status-danger";
            if (avg < 500) return "rpm-status-danger";
            if (avg < 1000) return "rpm-status-warning";
            return "";
        });

        self.minRPMStatusClass = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            if (filtered.length === 0) return "rpm-status-danger";

            var min = Math.min.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            if (min === 0) return "rpm-status-danger";
            if (min < 500) return "rpm-status-danger";
            if (min < 1000) return "rpm-status-warning";
            return "";
        });

        self.maxRPMStatusClass = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            if (filtered.length === 0) return "rpm-status-danger";

            var max = Math.max.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            if (max === 0) return "rpm-status-danger";
            if (max < 500) return "rpm-status-danger";
            if (max < 1000) return "rpm-status-warning";
            return "";
        });

        // Set time window
        self.setTimeWindow = function(window) {
            self.timeWindow(window);
        };

        // Handle messages from plugin
        self.onDataUpdaterPluginMessage = function(plugin, data) {
            if (plugin !== "fanrpm") return;

            console.log("FanRPM: Received message", data);

            if (data.rpm !== undefined) {
                var rpm = data.rpm;
                var now = new Date();

                self.currentRPM(rpm);

                // Add to rolling window
                self.rpmHistory.push({
                    rpm: rpm,
                    time: now
                });

                // Trim to max size (keep last 30 minutes)
                if (self.rpmHistory().length > self.maxHistorySize) {
                    self.rpmHistory.shift();
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
        };
    }

    OCTOPRINT_VIEWMODELS.push({
        construct: FanRPMViewModel,
        dependencies: ["settingsViewModel"],
        elements: ["#sidebar_plugin_fanrpm"]
    });
});
