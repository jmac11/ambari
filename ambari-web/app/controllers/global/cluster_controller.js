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

App.ClusterController = Em.Controller.extend({
  name: 'clusterController',
  cluster: null,
  isLoaded: false,
  ambariProperties: null,
  ambariViews: [],
  clusterDataLoadedPercent: 'width:0', // 0 to 1

  isGangliaUrlLoaded: false,
  isNagiosUrlLoaded: false,

  /**
   * Provides the URL to use for Ganglia server. This URL
   * is helpful in populating links in UI.
   *
   * If null is returned, it means GANGLIA service is not installed.
   */
  gangliaUrl: null,

  /**
   * Provides the URL to use for NAGIOS server. This URL
   * is helpful in getting alerts data from server and also
   * in populating links in UI.
   *
   * If null is returned, it means NAGIOS service is not installed.
   */
  nagiosUrl: null,
  updateLoadStatus: function (item) {
    var loadList = this.get('dataLoadList');
    var loaded = true;
    var numLoaded = 0;
    var loadListLength = 0;
    loadList.set(item, true);
    for (var i in loadList) {
      if (loadList.hasOwnProperty(i)) {
        loadListLength++;
        if (!loadList[i] && loaded) {
          loaded = false;
        }
      }
      // calculate the number of true
      if (loadList.hasOwnProperty(i) && loadList[i]) {
        numLoaded++;
      }
    }
    this.set('isLoaded', loaded);
    this.set('clusterDataLoadedPercent', 'width:' + (Math.floor(numLoaded / loadListLength * 100)).toString() + '%');
  },

  dataLoadList: Em.Object.create({
    'hosts': false,
    'serviceMetrics': false,
    'stackComponents': false,
    'services': false,
    'cluster': false,
    'clusterStatus': false,
    'racks': false,
    'users': false,
    'componentConfigs': false,
    'componentsState': false
  }),

  /**
   * load cluster name
   */
  loadClusterName: function (reload) {
    if (this.get('clusterName') && !reload) {
      return false;
    }

    App.ajax.send({
      name: 'cluster.load_cluster_name',
      sender: this,
      success: 'loadClusterNameSuccessCallback',
      error: 'loadClusterNameErrorCallback'
    });

    if (!App.get('currentStackVersion')) {
      App.set('currentStackVersion', App.defaultStackVersion);
    }
  },

  loadClusterNameSuccessCallback: function (data) {
    this.set('cluster', data.items[0]);
    App.set('clusterName', data.items[0].Clusters.cluster_name);
    App.set('currentStackVersion', data.items[0].Clusters.version);
  },

  loadClusterNameErrorCallback: function (request, ajaxOptions, error) {
    console.log('failed on loading cluster name');
    this.set('isLoaded', true);
  },

  /**
   * load current server clock in milli-seconds
   */
  loadClientServerClockDistance: function () {
    var dfd = $.Deferred();
    this.getServerClock().done(function () {
      dfd.resolve();
    });
    return dfd.promise();
  },

  getServerClock: function () {
    return App.ajax.send({
      name: 'ambari.service.load_server_clock',
      sender: this,
      success: 'getServerClockSuccessCallback',
      error: 'getServerClockErrorCallback'
    });
  },
  getServerClockSuccessCallback: function (data) {
    var clientClock = new Date().getTime();
    var serverClock = (data.RootServiceComponents.server_clock).toString();
    serverClock = serverClock.length < 13 ? serverClock + '000' : serverClock;
    App.set('clockDistance', serverClock - clientClock);
    App.set('currentServerTime', parseInt(serverClock));
    console.log('loading ambari server clock distance');
  },
  getServerClockErrorCallback: function () {
    console.log('Cannot load ambari server clock');
  },

  getUrl: function (testUrl, url) {
    return (App.testMode) ? testUrl : App.apiPrefix + '/clusters/' + this.get('clusterName') + url;
  },

  setGangliaUrl: function () {
    if (App.testMode) {
      return 'http://gangliaserver/ganglia/?t=yes';
    } else {
      // We want live data here
      if (this.get('isLoaded')) {
        this.set('isGangliaUrlLoaded', true);
        App.ajax.send({
          name: 'hosts.for_quick_links',
          sender: this,
          data: {
            clusterName: App.get('clusterName'),
            masterComponents: 'GANGLIA_SERVER',
            urlParams: ''
          },
          success: 'setGangliaUrlSuccessCallback'
        });
      }
    }
  }.observes('App.router.updateController.isUpdated', 'dataLoadList.hosts', 'gangliaWebProtocol', 'isLoaded'),

  setGangliaUrlSuccessCallback: function (response) {
    var url = null;
    if (response.items.length > 0) {
      url = this.get('gangliaWebProtocol') + "://" + (App.singleNodeInstall ? App.singleNodeAlias + ":42080" : response.items[0].Hosts.public_host_name) + "/ganglia";
    }
    this.set('gangliaUrl', url);
    this.set('isGangliaUrlLoaded', true);
  },

  setNagiosUrl: function () {
    if (App.testMode) {
      return 'http://nagiosserver/nagios';
    } else {
      // We want live data here
      if (this.get('isLoaded')) {
        this.set('isNagiosUrlLoaded', false);
        App.ajax.send({
          name: 'hosts.for_quick_links',
          sender: this,
          data: {
            clusterName: App.get('clusterName'),
            masterComponents: 'NAGIOS_SERVER',
            urlParams: ''
          },
          success: 'setNagiosUrlSuccessCallback'
        });
      }
    }
  }.observes('App.router.updateController.isUpdated', 'dataLoadList.serviceMetrics', 'dataLoadList.hosts', 'nagiosWebProtocol', 'isLoaded'),

  setNagiosUrlSuccessCallback: function (response) {
    var url = null;
    if (response.items.length > 0) {
      url = this.get('nagiosWebProtocol') + "://" + (App.singleNodeInstall ? App.singleNodeAlias + ":42080" : response.items[0].Hosts.public_host_name) + "/nagios";
    }
    this.set('nagiosUrl', url);
    this.set('isNagiosUrlLoaded', true);
  },

  nagiosWebProtocol: function () {
    var properties = this.get('ambariProperties');
    if (properties && properties.hasOwnProperty('nagios.https') && properties['nagios.https']) {
      return "https";
    } else {
      return "http";
    }
  }.property('ambariProperties'),

  gangliaWebProtocol: function () {
    var properties = this.get('ambariProperties');
    if (properties && properties.hasOwnProperty('ganglia.https') && properties['ganglia.https']) {
      return "https";
    } else {
      return "http";
    }
  }.property('ambariProperties'),

  isNagiosInstalled: function () {
    return !!App.Service.find().findProperty('serviceName', 'NAGIOS');
  }.property('App.router.updateController.isUpdated', 'dataLoadList.serviceMetrics'),

  isGangliaInstalled: function () {
    return !!App.Service.find().findProperty('serviceName', 'GANGLIA');
  }.property('App.router.updateController.isUpdated', 'dataLoadList.serviceMetrics'),

  /**
   *
   *  load all data and update load status
   */
  loadClusterData: function () {
    var self = this;
    this.loadAmbariProperties();
    this.loadAmbariViews();
    if (!this.get('clusterName')) {
      return;
    }

    if (this.get('isLoaded')) { // do not load data repeatedly
      App.router.get('mainController').startPolling();
      return;
    }
    var clusterUrl = this.getUrl('/data/clusters/cluster.json', '?fields=Clusters');
    var usersUrl = App.testMode ? '/data/users/users.json' : App.apiPrefix + '/users/?fields=*';
    var racksUrl = "/data/racks/racks.json";


    var hostsController = App.router.get('mainHostController');
    hostsController.set('isCountersUpdating', true);
    hostsController.updateStatusCounters();
    hostsController.set('isCountersUpdating', false);

    App.HttpClient.get(racksUrl, App.racksMapper, {
      complete: function (jqXHR, textStatus) {
        self.updateLoadStatus('racks');
      }
    }, function (jqXHR, textStatus) {
      self.updateLoadStatus('racks');
    });

    App.HttpClient.get(clusterUrl, App.clusterMapper, {
      complete: function (jqXHR, textStatus) {
        self.updateLoadStatus('cluster');
      }
    }, function (jqXHR, textStatus) {
      self.updateLoadStatus('cluster');
    });

    if (App.testMode) {
      self.updateLoadStatus('clusterStatus');
    } else {
      App.clusterStatus.updateFromServer(true).complete(function () {
        self.updateLoadStatus('clusterStatus');
      });
    }

    App.HttpClient.get(usersUrl, App.usersMapper, {
      complete: function (jqXHR, textStatus) {
        self.updateLoadStatus('users');
      }
    }, function (jqXHR, textStatus) {
      self.updateLoadStatus('users');
    });

    /**
     * Order of loading:
     * 1. request for service components supported by stack
     * 2. load stack components to model
     * 3. request for services
     * 4. put services in cache
     * 5. request for hosts and host-components (single call)
     * 6. request for service metrics
     * 7. load host-components to model
     * 8. load hosts to model
     * 9. load services from cache with metrics to model
     * 10. update stale_configs of host-components (depends on App.supports.hostOverrides)
     */
    this.loadStackServiceComponents(function (data) {
      var updater = App.router.get('updateController');

      require('utils/component').loadStackServiceComponentModel(data);
      self.updateLoadStatus('stackComponents');
      updater.updateServices(function () {
        self.updateLoadStatus('services');
        updater.updateHost(function () {
          self.updateLoadStatus('hosts');
        });

        updater.updateServiceMetric(function () {
          updater.updateComponentsState(function () {
            self.updateLoadStatus('componentsState');
          });
          self.updateLoadStatus('serviceMetrics');
        });

        if (App.supports.hostOverrides) {
          updater.updateComponentConfig(function () {
            self.updateLoadStatus('componentConfigs');
          });
        } else {
          self.updateLoadStatus('componentConfigs');
        }
      });
    });
  },

  requestHosts: function (realUrl, callback) {
    var testHostUrl = App.get('isHadoop2Stack') ? '/data/hosts/HDP2/hosts.json' : '/data/hosts/hosts.json';
    var url = this.getUrl(testHostUrl, realUrl);
    App.HttpClient.get(url, App.hostsMapper, {
      complete: callback
    }, callback)
  },

  loadAmbariViews: function () {
    App.ajax.send({
      name: 'views.info',
      sender: this,
      success: 'loadAmbariViewsSuccess'
    });
  },

  loadAmbariViewsSuccess: function (data) {
    this.set('ambariViews', []);
    data.items.forEach(function (item) {
      App.ajax.send({
        name: 'views.instances',
        data: {
          viewName: item.ViewInfo.view_name
        },
        sender: this,
        success: 'loadViewInstancesSuccess'
      });
    }, this)
  },

  loadViewInstancesSuccess: function (data) {
    data.versions.forEach(function (version) {
      version.instances.forEach(function (instance) {
        var view = Em.Object.create({
          label: instance.ViewInstanceInfo.label || instance.ViewInstanceInfo.instance_name,
          viewName: instance.ViewInstanceInfo.view_name,
          instanceName: instance.ViewInstanceInfo.instance_name,
          version: version.ViewVersionInfo.version,
          href: "/views/" + instance.ViewInstanceInfo.view_name + "/" + version.ViewVersionInfo.version + "/" + instance.ViewInstanceInfo.instance_name
        });
        this.get('ambariViews').pushObject(view);
      }, this);
    }, this);
  },

  /**
   *
   * @param callback
   */
  loadStackServiceComponents: function (callback) {
    var callbackObj = {
      loadStackServiceComponentsSuccess: callback
    };
    App.ajax.send({
      name: 'wizard.service_components',
      data: {
        stackUrl: App.get('stackVersionURL'),
        stackVersion: App.get('currentStackVersionNumber'),
        async: true
      },
      sender: callbackObj,
      success: 'loadStackServiceComponentsSuccess'
    });
  },

  loadAmbariProperties: function () {
    return App.ajax.send({
      name: 'ambari.service',
      sender: this,
      success: 'loadAmbariPropertiesSuccess',
      error: 'loadAmbariPropertiesError'
    });
  },

  loadAmbariPropertiesSuccess: function (data) {
    console.log('loading ambari properties');
    this.set('ambariProperties', data.RootServiceComponents.properties);
  },

  loadAmbariPropertiesError: function () {
    console.warn('can\'t get ambari properties');
  },

  clusterName: function () {
    return (this.get('cluster')) ? this.get('cluster').Clusters.cluster_name : null;
  }.property('cluster'),

  updateClusterData: function () {
    var testUrl = App.get('isHadoop2Stack') ? '/data/clusters/HDP2/cluster.json' : '/data/clusters/cluster.json';
    var clusterUrl = this.getUrl(testUrl, '?fields=Clusters');
    App.HttpClient.get(clusterUrl, App.clusterMapper, {
      complete: function () {
      }
    });
  }
});
