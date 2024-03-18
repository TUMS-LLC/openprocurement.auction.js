var appRequires = [
  'ui.bootstrap',
  'ngCookies',
  'pascalprecht.translate',
  'angular-growl',
];

var db_url = db_url || (location.protocol + '//' + location.host + '/' + window.db_name) || "";

angular.module('auction', appRequires).constant('AuctionConfig', {
  remote_db: db_url,
  restart_retries: 10,
  default_lang: 'uk',
  debug: false
});
