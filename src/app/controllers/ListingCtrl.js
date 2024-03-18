angular.module('auction').controller('ListingController',[
  'AuctionConfig', 'AuctionUtils', '$scope', '$http',
  function (AuctionConfig, AuctionUtils, $scope, $http) {
    /*@ngInject;*/
    $scope.auctions = [],
    $scope.offset = AuctionUtils.parseQueryString(location.search.substr(1)).offset || 0;
    var limit = 10;
    var page = $scope.offset / limit + 1;
    var skip = page * limit;
    $scope.db_url = db_url || location.protocol + '//' + location.host + '/' + window.db_name || '';
    $http({
      method: 'GET',
      url: $scope.db_url + '/_design/auctions/_view/by_endDate',
      cache: true,
      params: {
        skip: skip,
        limit: limit,
        include_docs: true,
        startkey: (new Date()).getTime()
      },
    }).then(function(resp) {
      $scope.parseListing = function(t) {
        var type = t || "default";
        return "texas" === type ? "texas-auctions" : "dutch" === type ? "insider-auctions" : "simple" === type || "multilot" === type || "meat" === type || "default" === type ? "auctions" : "";
      }
      $scope.auctions = resp.data.rows;
      $scope.total_rows = resp.data.total_rows;
      $scope.offset = resp.data.offset;
    });
    $scope.hasPrev = function() {
        return page > 1;
    }
    $scope.hasNext = function() {
        var t = Math.floor($scope.total_rows / limit) + $scope.total_rows % limit;
        return page != t && $scope.auctions.length > 0;
    }
  }
]);
