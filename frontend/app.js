(function () {
  'use strict';

  const API_BASE = 'http://localhost:3000/api';
  const REFRESH_INTERVAL_MS = 5000;

  angular.module('fleetApp', []).controller('FleetController', ['$http', '$interval', function ($http, $interval) {
    const vm = this;

    // ---------- State ----------
    vm.devices = [];
    vm.summary = {};
    vm.loading = true;
    vm.lastRefresh = null;
    vm.clock = '';

    vm.isLoggedIn = false;
    vm.authToken = null;

    vm.showLogin = false;
    vm.loginForm = { username: '', password: '' };
    vm.loginError = null;

    vm.showRegister = false;
    vm.registerForm = { name: '', deviceType: 'mobile', os: '' };

    // ---------- Helpers ----------
    function authHeaders() {
      return vm.authToken ? { Authorization: 'Bearer ' + vm.authToken } : {};
    }

    vm.formatLastSeen = function (isoString) {
      if (!isoString) return 'Never';
      const seconds = Math.round((Date.now() - new Date(isoString).getTime()) / 1000);
      if (seconds < 60) return seconds + 's ago';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      return Math.floor(seconds / 3600) + 'h ago';
    };

    // ---------- Data fetching ----------
    function fetchDevices() {
      return $http.get(API_BASE + '/devices').then(function (res) {
        vm.devices = res.data;
      });
    }

    function fetchSummary() {
      return $http.get(API_BASE + '/fleet/summary').then(function (res) {
        vm.summary = res.data;
      });
    }

    function refreshAll() {
      vm.loading = true;
      return Promise.all([fetchDevices(), fetchSummary()]).then(function () {
        vm.loading = false;
        vm.lastRefresh = new Date().toLocaleTimeString();
      }).catch(function (err) {
        vm.loading = false;
        console.error('Failed to refresh dashboard data', err);
      });
    }

    // ---------- Auth ----------
    vm.login = function () {
      vm.loginError = null;
      $http.post(API_BASE + '/auth/login', vm.loginForm).then(function (res) {
        vm.authToken = res.data.token;
        vm.isLoggedIn = true;
        vm.showLogin = false;
        vm.loginForm = { username: '', password: '' };
      }).catch(function () {
        vm.loginError = 'Invalid username or password.';
      });
    };

    vm.logout = function () {
      vm.authToken = null;
      vm.isLoggedIn = false;
    };

    // ---------- Device actions ----------
    vm.registerDevice = function () {
      if (!vm.registerForm.name) return;
      $http.post(API_BASE + '/devices', vm.registerForm).then(function () {
        vm.showRegister = false;
        vm.registerForm = { name: '', deviceType: 'mobile', os: '' };
        refreshAll();
      });
    };

    vm.sendCommand = function (device, command) {
      $http.post(API_BASE + '/devices/' + device.id + '/command', { command: command }, { headers: authHeaders() })
        .then(function () {
          refreshAll();
        })
        .catch(function (err) {
          console.error('Command failed', err);
          alert('Command failed: ' + (err.data && err.data.error ? err.data.error : 'unknown error'));
        });
    };

    vm.deleteDevice = function (device) {
      if (!confirm('Remove "' + device.name + '" from the fleet?')) return;
      $http.delete(API_BASE + '/devices/' + device.id, { headers: authHeaders() }).then(function () {
        refreshAll();
      });
    };

    // ---------- Init ----------
    refreshAll();
    $interval(refreshAll, REFRESH_INTERVAL_MS);

    function tickClock() {
      vm.clock = new Date().toLocaleTimeString();
    }
    tickClock();
    $interval(tickClock, 1000);

  }]);
})();