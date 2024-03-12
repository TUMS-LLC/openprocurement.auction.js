angular.module('auction').directive('format', ['$filter', function($filter) {
  return {
    require: '?ngModel',
    link: function(scope, elem, attrs, ctrl) {
      if (!ctrl) return;
      ctrl.$formatters.unshift(function(value) {
        if (value) {
          var formatters_value = math.format(Number(value), {
            notation: 'fixed',
            precision: 2
          }).replace(/(\d)(?=(\d{3})+\.)/g, '$1 ').replace(/\./g, ",");
          ctrl.prev_value = formatters_value;
          return formatters_value;
        } else {
          return "";
        }
      });
      ctrl.$parsers.unshift(function(viewValue) {
        var newviewValue;
        var plainNumber;
        if (viewValue) {
          plainNumber = Number((viewValue || "").replace(/ /g, '').replace(/,/g, "."));
          if (plainNumber >= 0) {
            newviewValue = viewValue;
            ctrl.prev_value = viewValue;
          } else {
            try {
              plainNumber = Number((ctrl.prev_value || null).replace(/ /g, '').replace(/,/g, "."));
            } catch (e) {
              plainNumber = null;
            }
            newviewValue = ctrl.prev_value;
          }
          //TODO: linter warn `newviewValue` is out of scope
          ctrl.$viewValue = newviewValue;
          ctrl.$render();
        } else {
          plainNumber = null;
        }
        return plainNumber;
      });
    }
  };
}]);
