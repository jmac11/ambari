/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


var App = require('app');
var misc = require('utils/misc');

App.Host = DS.Model.extend({
  hostName: DS.attr('string'),
  publicHostName: DS.attr('string'),
  cluster: DS.belongsTo('App.Cluster'),
  hostComponents: DS.hasMany('App.HostComponent'),
  cpu: DS.attr('string'),
  cpuPhysical: DS.attr('string'),
  memory: DS.attr('string'),
  diskTotal: DS.attr('number'),
  diskFree: DS.attr('number'),
  osArch: DS.attr('string'),
  ip: DS.attr('string'),
  rack: DS.attr('string'),
  healthStatus: DS.attr('string'),
  lastHeartBeatTime: DS.attr('number'),
  osType: DS.attr("string"),
  diskInfo: DS.attr('object'),
  loadOne:DS.attr('number'),
  loadFive:DS.attr('number'),
  loadFifteen:DS.attr('number'),
  memTotal:DS.attr('number'),
  memFree:DS.attr('number'),
  cpuSystem:DS.attr('number'),
  cpuUser:DS.attr('number'),
  criticalAlertsCount: DS.attr('number'),
  passiveState: DS.attr('string'),

  /**
   * Is host checked at the main Hosts page
   */
  selected:DS.attr('boolean'),
  /**
   * determine whether host is requested from server
   */
  isRequested: DS.attr('boolean'),

  /**
   * Overall CPU usage (system and user)
   * @returns {Number}
   */
  cpuUsage: function () {
    if (this.get('cpuSystem') && this.get('cpuUser')) {
      return this.get('cpuSystem') + this.get('cpuUser');
    }
    return 0;
  }.property('cpuSystem', 'cpuUser'),

  /**
   * Percent value of used memory
   * @returns {Number}
   */
  memoryUsage: function () {
    if (this.get('memFree') && this.get('memTotal')) {
      var memUsed = this.get('memTotal') - this.get('memFree');
      return (100 * memUsed) / this.get('memTotal');
    }
    return 0;
  }.property('memTotal', 'memFree'),

  componentsWithStaleConfigs: function () {
    return this.get('hostComponents').filterProperty('staleConfigs', true);
  }.property('hostComponents.@each.staleConfigs'),

  /**
   * Get count of host components with stale configs
   * @returns {Number}
   */
  componentsWithStaleConfigsCount: function() {
    return this.get('componentsWithStaleConfigs').length;
  }.property('componentsWithStaleConfigs.length'),

  /**
   * Get count of host components in passive state
   * @returns {Number}
   */
  componentsInPassiveStateCount: function() {
    return this.get('hostComponents').filter(function(component) {
      return component.get('passiveState') !== 'OFF';
    }).length;
  }.property('hostComponents.@each.passiveState'),

  /**
   * Count of mounted on host disks
   * @returns {Number}
   */
  disksMounted: function() {
    return this.get('diskInfo.length');
  }.property('diskInfo.length'),

  coresFormatted: function() {
    return this.get('cpu') + ' (' + this.get('cpuPhysical') + ')';
  }.property('cpu', 'cpuPhysical'),

  /**
   * API return diskTotal and diskFree. Need to save their different
   * @returns {Number}
   */
  diskUsed: function(){
    return this.get('diskTotal') - this.get('diskFree');
  }.property('diskFree', 'diskTotal'),

  /**
   * Format diskUsed value to float with 2 digits (also convert to GB)
   * @returns {String} Format: '*** GB'
   */
  diskUsedFormatted: function() {
    return Math.round(this.get('diskUsed') * Math.pow(10, 2)) / Math.pow(10, 2) + 'GB';
  }.property('diskUsed'),

  /**
   * Format diskTotal value to float with 2 digits (also convert to GB)
   * @returns {String} Format: '*** GB'
   */
  diskTotalFormatted: function() {
    return Math.round(this.get('diskTotal') * Math.pow(10, 2)) / Math.pow(10, 2) + 'GB';
  }.property('diskTotal'),

  /**
   * Percent value of used disk space
   * @returns {Number}
   */
  diskUsage: function() {
    return (this.get('diskUsed')) / this.get('diskTotal') * 100;
  }.property('diskUsed', 'diskTotal'),

  /**
   * Format diskUsage to float with 2 digits
   * @returns {String} Format: '**.** %'
   */
  diskUsageFormatted: function() {
    if (isNaN(this.get('diskUsage')) || this.get('diskUsage') < 0) {
      return Em.I18n.t('hosts.host.metrics.dataUnavailable');
    }
    var s = Math.round(this.get('diskUsage') * Math.pow(10, 2)) / Math.pow(10, 2);
    if (isNaN(s)) {
      s = 0;
    }
    return s + '%';
  }.property('diskUsage'),

  /**
   * Formatted string with data about disk usage
   * @returns {String}
   */
  diskInfoBar: function() {
    if (isNaN(this.get('diskUsage')) || this.get('diskUsage') < 0) {
      return this.get('diskUsageFormatted');
    }
    return this.get('diskUsedFormatted') + '/' + this.get('diskTotalFormatted') + ' (' + this.get('diskUsageFormatted')
      + ' ' + Em.I18n.t('services.service.summary.diskInfoBar.used') + ')';
  }.property('diskUsedFormatted', 'diskTotalFormatted'),

  /**
   * Formatted bytes to appropriate value
   * @returns {String}
   */
  memoryFormatted: function () {
    return misc.formatBandwidth(this.get('memory') * 1024);
  }.property('memory'),

  /**
   * Return true if the host <code>healthStatus</code> is UNKNOWN
   * @returns {bool}
   */
  isNotHeartBeating : function() {
    return (App.testMode) ? false : (this.get('healthStatus') === "UNKNOWN");
  }.property('lastHeartBeatTime'),

  /**
   * Average load
   * @returns {Number}
   */
  loadAvg: function() {
    if (this.get('loadOne') != null) return this.get('loadOne').toFixed(2);
    if (this.get('loadFive') != null) return this.get('loadFive').toFixed(2);
    if (this.get('loadFifteen') != null) return this.get('loadFifteen').toFixed(2);
    return null;
  }.property('loadOne', 'loadFive', 'loadFifteen'),

  /**
   * Host health indicator
   * Based on  <code>healthStatus</code>
   * @returns {String}
   */
  healthClass: function(){
    if (this.get('passiveState')!= 'OFF') {
      return 'icon-medkit';
    }
    var statusMap = {
      'UNKNOWN': 'health-status-DEAD-YELLOW',
      'HEALTHY': 'health-status-LIVE',
      'UNHEALTHY': 'health-status-DEAD-RED',
      'ALERT': 'health-status-DEAD-ORANGE'
    };
    return statusMap[this.get('healthStatus')] || 'health-status-DEAD-YELLOW';
  }.property('healthStatus'),

  healthIconClass: function () {
    switch (this.get('healthClass')) {
      case 'health-status-LIVE':
        return App.healthIconClassGreen;
        break;
      case 'health-status-DEAD-RED':
        return App.healthIconClassRed;
        break;
      case 'health-status-DEAD-YELLOW':
        return App.healthIconClassYellow;
        break;
      case 'health-status-DEAD-ORANGE':
        return App.healthIconClassOrange;
        break;
      default:
        return "";
        break;
    }
  }.property('healthClass'),

  /**
   * Tooltip for host indicator
   * Contains affected host components names (based on <code>healthClass</code>)
   * @returns {String}
   */
  healthToolTip: function(){
    var hostComponents = this.get('hostComponents').filter(function(item){
      return item.get('workStatus') !== App.HostComponentStatus.started;
    });
    var output = '';
    if (this.get('passiveState') != 'OFF') {
      return Em.I18n.t('hosts.host.passive.mode');
    }
    switch (this.get('healthClass')){
      case 'health-status-DEAD-RED':
        hostComponents = hostComponents.filterProperty('isMaster', true);
        output = Em.I18n.t('hosts.host.healthStatus.mastersDown');
        hostComponents.forEach(function(hc, index){
          output += (index == (hostComponents.length-1)) ? hc.get('displayName') : (hc.get('displayName')+", ");
        }, this);
        break;
      case 'health-status-DEAD-YELLOW':
        output = Em.I18n.t('hosts.host.healthStatus.heartBeatNotReceived');
        break;
      case 'health-status-DEAD-ORANGE':
        hostComponents = hostComponents.filterProperty('isSlave', true);
        output = Em.I18n.t('hosts.host.healthStatus.slavesDown');
        hostComponents.forEach(function(hc, index){
          output += (index == (hostComponents.length-1)) ? hc.get('displayName') : (hc.get('displayName')+", ");
        }, this);
        break;
      case 'health-status-LIVE':
        output = Em.I18n.t('hosts.host.healthStatus.allUp');
        break;
    }
    return output;
  }.property('hostComponents.@each.workStatus','hostComponents.@each.passiveState')
});

App.Host.FIXTURES = [];
