angular.module('auction').controller('AuctionController',[
  'AuctionConfig', 'AuctionUtils',
  '$timeout', '$http', '$log', '$cookies',
  '$rootScope', '$translate', '$filter', 'growl', '$aside',
  function(AuctionConfig, AuctionUtils,
  $timeout, $http, $log, $cookies,
  $rootScope, $translate, $filter, growl, $aside) {
    var base_url = window.location.href.replace(window.location.search, '');
    var evtSrc = '';
    var response_timeout = '';
    $rootScope.here = base_url;
    if (AuctionUtils.inIframe() && 'localhost'!= location.hostname) {
      $log.error('Starts in iframe');
      window.open(location.href, '_blank');
      return false;
    }

    var parts = window.location.pathname.split('/');

    AuctionConfig.auction_doc_id = parts[parts.length - 1];

    $rootScope.lang = 'uk';
    $rootScope.format_date = AuctionUtils.format_date;
    $rootScope.bidder_id = null;
    $rootScope.bid = null;
    $rootScope.alerts = [];
    $rootScope.default_http_error_timeout = 500;
    $rootScope.http_error_timeout = $rootScope.default_http_error_timeout;
    $rootScope.browser_client_id = AuctionUtils.generateUUID();

    window.onunload = function () {
      $log.info("Close window");
    }

    $log.info({
      message: "Start session",
      browser_client_id: $rootScope.browser_client_id,
      user_agent: navigator.userAgent,
      tenderId: AuctionConfig.auction_doc_id
    });

    $rootScope.start = function() {
      $log.info({
        message: "Setup connection to remote_db",
        auctions_loggedin: $cookies.auctions_loggedin||AuctionUtils.detectIE()
      });
      if ($cookies.auctions_loggedin||AuctionUtils.detectIE()) {
        AuctionConfig.remote_db = AuctionConfig.remote_db + "_secured";
      }
      $rootScope.changes_options = {
        timeout: 40000 - Math.ceil(Math.random() * 10000),
        heartbeat: 10000,
        live: true,
        style: 'main_only',
        continuous: true,
        include_docs: true,
        doc_ids: [AuctionConfig.auction_doc_id],
        since: 0
      };

      $http.get(db_url).then(function(response) {
        $rootScope.http_error_timeout = $rootScope.default_http_error_timeout;
        $rootScope.start_auction_process();
      }).catch(function(error) {
        $log.error({
          message: "Error on setup connection to remote_db",
          error_data: error
        });
        $rootScope.http_error_timeout = $rootScope.http_error_timeout * 2;
        $timeout(function() {
          $rootScope.start();
        }, $rootScope.http_error_timeout);
      });
    };
    if (($translate.storage().get($translate.storageKey()) === "undefined") || ($translate.storage().get($translate.storageKey()) === undefined)) {
      $translate.use(AuctionConfig.default_lang);
      $rootScope.lang = AuctionConfig.default_lang;
    } else {
      $rootScope.lang = $translate.storage().get($translate.storageKey()) || $rootScope.lang;
    }

    $rootScope.changeLanguage = function(langKey) {
      $translate.use(langKey);
      $rootScope.lang = langKey;
    };
    // Bidding form msgs
    $rootScope.closeAlert = function(msg_id) {
      for (var i = 0; i < $rootScope.alerts.length; i++) {
        if ($rootScope.alerts[i].msg_id == msg_id) {
          $rootScope.alerts.splice(i, 1);
          return true;
        }
      }
    };
    $rootScope.auto_close_alert = function(msg_id) {
      $timeout(function() {
        $rootScope.closeAlert(msg_id);
      }, 4000);
    };
    $rootScope.get_round_number = function(pause_index) {
      return AuctionUtils.get_round_data(pause_index, $rootScope.auction_doc, $rootScope.Rounds);
    };

    $rootScope.sync_times_with_server = function(start) {
      $http.get('/get_current_server_time', {
        'params': {
          '_nonce': Math.random().toString()
        }
      }).then(function(data) {
        $rootScope.last_sync = new Date(new Date(data.headers().date));
        $rootScope.info_timer = AuctionUtils.prepare_info_timer_data($rootScope.last_sync, $rootScope.auction_doc, $rootScope.bidder_id, $rootScope.Rounds);
        $log.debug({
          message: "Info timer data:",
          info_timer: $rootScope.info_timer
        });
        $rootScope.progres_timer = AuctionUtils.prepare_progress_timer_data($rootScope.last_sync, $rootScope.auction_doc);
        $log.debug({
          message: "Progres timer data:",
          progress_timer: $rootScope.progres_timer
        });
      }, function(data, status, headers, config) {
        $log.error("get_current_server_time error");
      });
    };

    $rootScope.start_auction_process = function() {
      $http.get(db_url + "/" + AuctionConfig.auction_doc_id).then(function(response) {
        var doc = response.data;

        if (doc.auction_type === 'dutch') {
          $log.error({
            message: 'Please use the correct link to view the auction'
          });
          $rootScope.document_not_found = true;
          var msg_correct_link = $filter('translate')('Please use the correct link to view the auction.');
          document.body.insertAdjacentHTML('afterbegin', '<div class="container alert alert-danger" role="alert">' + msg_correct_link + '</div>');
        } else {
          $rootScope.http_error_timeout = $rootScope.default_http_error_timeout;
          $rootScope.title_ending = AuctionUtils.prepare_title_ending_data(doc, $rootScope.lang);
          $rootScope.replace_document(doc);
          $rootScope.document_exists = true;

          if (AuctionUtils.UnsupportedBrowser()) {
            $timeout(function() {
              $rootScope.unsupported_browser = true;
              growl.error($filter('translate')('Your browser is out of date, and this site may not work properly.') + '<a style="color: rgb(234, 4, 4); text-decoration: underline;" href="http://browser-update.org/uk/update.html">' + $filter('translate')('Learn how to update your browser.') + '</a>', {
                ttl: -1,
                disableCountDown: true
              });
            }, 500);
          }
          $rootScope.scroll_to_stage();
          $log.info({
            message: 'Auction ends already'
          });
        }
      }, function (response) {
        if (response.status == 404) {
          $log.error({
            message: 'Not Found Error',
            error_data: response
          });
          $rootScope.document_not_found = true;
        } else {
          $log.error({
            message: 'Server Error',
            error_data: response
          });
          $rootScope.http_error_timeout = $rootScope.http_error_timeout * 2;
          $timeout(function() {
            $rootScope.start_auction_process();
          }, $rootScope.http_error_timeout);
        }
      });
    }

    $rootScope.replace_document = function(new_doc) {
      if ((angular.isUndefined($rootScope.auction_doc)) || (new_doc.current_stage - $rootScope.auction_doc.current_stage === 0) || (new_doc.current_stage === -1)) {
        if (angular.isUndefined($rootScope.auction_doc)) {
          $log.info({
            message: 'Change current_stage',
            current_stage: new_doc.current_stage,
            stages: (new_doc.stages || []).length - 1
          });
        }
        $rootScope.auction_doc = new_doc;
      } else {
        $log.info({
          message: 'Change current_stage',
          current_stage: new_doc.current_stage,
          stages: (new_doc.stages || []).length - 1
        });
        $rootScope.auction_doc = new_doc;
      }
      $rootScope.sync_times_with_server();
      $rootScope.calculate_rounds();
      $rootScope.scroll_to_stage();
      if (!$rootScope.$$phase)
        $rootScope.$apply();
    };
    $rootScope.calculate_rounds = function(argument) {
      $rootScope.Rounds = [];
      $rootScope.auction_doc.stages.forEach(function(item, index) {
        if (item.type == 'pause') {
          $rootScope.Rounds.push(index);
        }
      });
    };
    $rootScope.scroll_to_stage = function() {
      AuctionUtils.scroll_to_stage($rootScope.auction_doc, $rootScope.Rounds);
    };
    $rootScope.array = function(int) {
      return new Array(int);
    };
    $rootScope.open_menu = function() {
      var modalInstance = $aside.open({
        templateUrl: 'templates/menu.html',
        size: 'lg',
        backdrop: true
      });
    };

    $rootScope.start();
  }
]);
