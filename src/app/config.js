angular.module('auction').config([
  '$qProvider', '$logProvider', '$httpProvider', 'AuctionConfig',
  function ($qProvider, $logProvider, $httpProvider, AuctionConfig) {
  $httpProvider.defaults.withCredentials = true;
  $qProvider.errorOnUnhandledRejections(false);
  $logProvider.debugEnabled(AuctionConfig.debug); // default is true
}]);
