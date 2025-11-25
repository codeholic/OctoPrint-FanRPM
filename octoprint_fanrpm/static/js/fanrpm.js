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

            return Math.round(sum / filtered.length);
        });

        self.minRPM = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            self.timeWindow(); // Track dependency

            if (filtered.length === 0) return "0";

            var min = Math.min.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            return min;
        });

        self.maxRPM = ko.pureComputed(function() {
            var filtered = self.getFilteredData();
            self.timeWindow(); // Track dependency

            if (filtered.length === 0) return "0";

            var max = Math.max.apply(null, filtered.map(function(entry) {
                return entry.rpm;
            }));

            return max;
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
            self.updateGraph();
        };

        // Graph plotting
        self.plot = null;
        self.lastWindow = null; // Track last window to detect changes
        self.updateGraph = function() {
            var filtered = self.getFilteredData();

            if (filtered.length === 0) {
                if (self.plot) {
                    self.plot.shutdown();
                    self.plot = null;
                }
                return;
            }

            var now = new Date().getTime();
            var window = self.timeWindow();

            // Prepare data for Flot - use relative time in seconds
            var data = filtered.map(function(entry) {
                var relativeSeconds = (entry.time.getTime() - now) / 1000;
                return [relativeSeconds, entry.rpm];
            });

            // Set fixed axis range and ticks based on time window (needed for threshold lines)
            var minTime, maxTime = 0, ticks;
            if (window === "1min") {
                minTime = -60;
                ticks = [-60, -50, -40, -30, -20, -10, 0];
            } else if (window === "5min") {
                minTime = -5 * 60;
                ticks = [-5 * 60, -4 * 60, -3 * 60, -2 * 60, -1 * 60, 0];
            } else {
                minTime = -30 * 60;
                ticks = [-30 * 60, -25 * 60, -20 * 60, -15 * 60, -10 * 60, -5 * 60, 0];
            }

            // Calculate statistics for threshold lines
            var avg = 0, min = 0, max = 0;
            if (filtered.length > 0) {
                var sum = filtered.reduce(function(acc, entry) { return acc + entry.rpm; }, 0);
                avg = sum / filtered.length;
                min = Math.min.apply(null, filtered.map(function(entry) { return entry.rpm; }));
                max = Math.max.apply(null, filtered.map(function(entry) { return entry.rpm; }));
            }

            var dataset = [{
                data: data,
                color: "#468847",
                lines: { show: true, lineWidth: 2 },
                shadowSize: 0
            }];

            // Add horizontal dashed lines for avg, min, max
            if (filtered.length > 0) {
                dataset.push({
                    data: [[minTime, avg], [maxTime, avg]],
                    color: "#468847",
                    lines: { show: false },
                    dashes: { show: true, lineWidth: 1, dashLength: 5 },
                    shadowSize: 0
                });
                dataset.push({
                    data: [[minTime, min], [maxTime, min]],
                    color: "#b94a48",
                    lines: { show: false },
                    dashes: { show: true, lineWidth: 1, dashLength: 5 },
                    shadowSize: 0
                });
                dataset.push({
                    data: [[minTime, max], [maxTime, max]],
                    color: "#3a87ad",
                    lines: { show: false },
                    dashes: { show: true, lineWidth: 1, dashLength: 5 },
                    shadowSize: 0
                });
            }

            // Custom tick formatter for relative time
            var tickFormatter = function(val) {
                if (Math.abs(val) < 1) return "now";

                if (window === "1min") {
                    // For 1 min window, show seconds
                    return Math.round(val) + "s";
                } else {
                    // For 5 min and 30 min windows, show minutes
                    var minutes = Math.round(val / 60);
                    if (minutes === 0 && Math.abs(val) >= 1) {
                        // If less than 30 seconds but more than 1 second, show "-1m" or "1m"
                        return (val < 0 ? "-1m" : "1m");
                    }
                    return minutes + "m";
                }
            };

            var options = {
                xaxis: {
                    min: minTime,
                    max: maxTime,
                    ticks: ticks,
                    tickFormatter: tickFormatter
                },
                yaxis: {
                    min: 0,
                    tickFormatter: function(val) {
                        return val.toFixed(0);
                    }
                },
                grid: {
                    borderWidth: 1,
                    borderColor: "#ddd",
                    labelMargin: 8
                },
                legend: { show: false }
            };

            // Recreate plot only if window changed, otherwise just update data
            var windowChanged = (self.lastWindow !== window);

            if (windowChanged || !self.plot) {
                // Window changed or first time - recreate plot with new options
                if (self.plot) {
                    self.plot.shutdown();
                }
                self.plot = $.plot("#fanrpm-graph", dataset, options);
                self.lastWindow = window;
            } else {
                // Same window - just update data (much faster)
                self.plot.setData(dataset);
                self.plot.setupGrid();
                self.plot.draw();
            }
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

                // Update graph
                self.updateGraph();
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
