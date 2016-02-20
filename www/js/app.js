// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic','ngCordova'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if(window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    }
    if(window.StatusBar) {
      StatusBar.styleDefault();
    }
  });
})

.controller('CaptureCtrl', function($scope, $window, WinSrv, TextSrv,CameraSrv,$ionicActionSheet, $ionicLoading, $ionicPlatform, $cordovaCamera) {

  $ionicPlatform.ready(function() {

    $scope.showAnalyzeButton = false;
    $scope.roundNumber=2665;



    var self = this;

    this.showLoading = function() {
      $ionicLoading.show({
        template: '<ion-spinner></ion-spinner>'
      });
    };

    this.hideLoading = function(){
      $ionicLoading.hide();
    };

    this.getPicture = function(index){

      CameraSrv.getPicture()
        .then(function(imageData) {
          var image = document.getElementById('pic');
          image.src = "data:image/jpeg;base64," + imageData;
          $scope.showAnalyzeButton = true;
        })
        .catch(function(err) {
          console.log(err);
        });
    };

  });

  $scope.checkWining = function(results,roundNumber){
    var isWin = false;
    WinSrv.checkWining(results,roundNumber).then(function(res){
      angular.forEach(res,function(score){
        if (score.isWinning){
          isWin=true;
        }
      });

      if (isWin){
        alert('WIN !!!!!');
      }
      else{
        alert('No luck this time, try again !');
      }

    }).catch(function(err){
      alert('error');
    });

  };

  $scope.showActionSheet = function(){
    var hideSheet = $ionicActionSheet.show({
      buttons: [
       { text: 'Choose Photo' },
       { text: 'Take Photo' }
      ],
      cancelText: 'Cancel',
      cancel: function() {
        console.log('cancel');
      },
      buttonClicked: function(index) {
        getPicture(index);
       return true;
      }
    });
  };

  // $scope.showActionSheet();

  $scope.testOcrad = function(){
    self.showLoading();
    OCRAD(document.getElementById("pic"), function(text){
      self.hideLoading();
      console.log(text);
      alert(text);
    });
  };

  // $scope.customArrayFilter = function (item) {
  //   console.log(item);
  //   return ('*'+item +'*');
  // };

  $scope.analyzeText = function(){
    self.showLoading();
    TextSrv.analyze(document.getElementById("pic")).then(function(text){
      $ionicLoading.hide();
      self.hideLoading();
      // console.log(text);
      // alert(text);
      $scope.results = text;
    }).catch(function(err){
      console.log('ERR:', err);
      self.hideLoading();
      alert('Error , try again later');
    });

  }; 

})


.factory('CameraSrv', ['$rootScope', '$q', '$window',function($rootScope, $q, $window) {

  return {
    getPicture: function(options) {

      var deferred = $q.defer();

      if (!$window.Camera) {

        // create file input without appending to DOM
        var fileInput = document.createElement('input');
        fileInput.setAttribute('type', 'file');

        fileInput.onchange = function() {
          var file = fileInput.files[0];
          var reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = function () {
            $rootScope.$apply(function() {
              // strip beginning from string
              var encodedData = reader.result.replace(/data:image\/jpeg;base64,/, '');
              deferred.resolve(encodedData);
            });
          };
        };

        fileInput.click();
      } 
      else {
        var sourceType = index === 0 ? Camera.PictureSourceType.PHOTOLIBRARY : Camera.PictureSourceType.CAMERA;
        
        // set some default options
        var defaultOptions = {
          quality: 100,
          destinationType: Camera.DestinationType.DATA_URL,
          sourceType: sourceType,
          allowEdit: true,
          encodingType: Camera.EncodingType.JPEG,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false,
          correctOrientation:true
        };
        
        // allow overriding the default options
        options = angular.extend(defaultOptions, options);

        // success callback
        var success = function(imageData) {
          $rootScope.$apply(function() {
            deferred.resolve(imageData);
          });
        };

        // fail callback
        var fail = function(message) {
          $rootScope.$apply(function() {
            deferred.reject(message);
          });
        };

        // open camera via cordova
        navigator.camera.getPicture(success, fail, options);
      }

      // return a promise
      return deferred.promise;
    }
  };

}])

.service('TextSrv', [ '$q','$http', function($q, $http){

  var TextSrv={};

  TextSrv.getNumbers = function(text){
    var finalResults=[];
    var j=0;
    var rows = text.split('\n');
    var results=new Array(10);
    angular.forEach(rows, function(value, index) {
      var tableResults = [];
      if (value[value.length-1] === ')'){
        var id = value.substr(value.indexOf(')')-1,1);
        id = id === '0' ? 10 : id;
        results[id-1] = value.substr(0, value.indexOf(id+')')-1);
        
        var tmpResults = results[id-1].split(' ');
        var strong;
        angular.forEach(tmpResults, function(val,i){
          if (angular.isNumber(parseInt(val)) && val.length===2){
            tableResults.push(val);
          }
          else{
            if (angular.isNumber(parseInt(val)) && val.length===1){
              strong=val;
            }
          }
        });
        tableResults.push(strong);
        console.log(tableResults);

      }
      if (tableResults.length>0){
        finalResults.push(tableResults);
      }
      //finalResults.push(tableResults[tableResults.length-1]);
    });
    return finalResults;

  };

  TextSrv.analyze = function(img){
    var deferred = $q.defer();

    var data={
      "requests": 
          [
        {
          "image": 
          {
            
              "content":img.currentSrc.substr(img.currentSrc.indexOf('base64,')+7,img.currentSrc.length)
              
          },
          "features": 
          [
            {
              "maxResults": 1,
              "type": "TEXT_DETECTION"
            }
          ]
        }
      ]
    };
    var url='https://vision.googleapis.com/v1/images:annotate?key=';
    var key='AIzaSyDvEpus69g4_MoJr39sosKeYfJKkNG_SfI';

    $http.post(url + key,data,{ headers: {
         'Content-Type': 'application/json'}})
    .then(function(res){
      var description = res.data.responses[0].textAnnotations[0].description;
      console.log('RES:' ,description);
      
      deferred.resolve(TextSrv.getNumbers(description));
    }, function(err){
      console.log('ERR in submitStats:', err);
      deferred.reject(err);
    });

    return deferred.promise;

  };

  return TextSrv;

}])

.service('WinSrv', [ '$q','$http', function($q, $http){

  var WinSrv={};

  WinSrv.getWinning = function(round){
    var mock = { 
      number:2765,
      date: '16/02/16',
      results : [ '8','14','16','20','24','30','1']
    };
    // var mock = { 
    //   number:2765,
    //   date: '14/02/16',
    //   results : [ '37','28','25','12','09','01','6']
    // };
    if (round){
      return $q.when(mock);
    }
    else{
      return $q.when(mock);
    }

  }

  WinSrv.checkWining= function(results,round){
    var deferred = $q.defer();
    var selected;
    WinSrv.getWinning(round).then(function(winResultObj){
      var final = checkResults(results, winResultObj.results);
      deferred.resolve(final);



    }).catch(function(err){
      deferred.reject(err);
      alert('Error getting winning results');
    });

    return deferred.promise;
  };


  function checkResults(results,winResult){
    var resArr = [];
    angular.forEach(results,function(result,index){
      resArr.push(checkResult(result,winResult));
    });
    return resArr;
  };

  function checkResult(result,winResult){
    var resultObj={};
    var strongResult = result[result.length-1];
    var strongWinResult = winResult[winResult.length-1];

    resultObj.strongResult = strongResult;
    resultObj.strongWinResult = strongWinResult;
    resultObj.result = result;
    resultObj.winResult = winResult;
    resultObj.isWinStrong = strongWinResult === strongResult ? true : false;
    resultObj.matchNumbers = [];
    resultObj.isWinning = false;
    resultObj.allCorrectNumbers = false;

    var winResultObj = {};
    angular.forEach(winResult,function(num,i){
      if (i< winResult.length-1){
        winResultObj[num] = true;
      }
    });
    console.log(winResultObj);

    var countMatch=0;
    angular.forEach(result, function(number, index){
      if (winResultObj.hasOwnProperty(number)){
        countMatch=countMatch+1;
        resultObj.matchNumbers.push(number);
      }
    });
    if (countMatch===6){
      resultObj.allCorrectNumbers=true;
      if (resultObj.isWinStrong){
        resultObj.isWinning = true;
      }
    }
    return resultObj;

  };

  return WinSrv;

}])

.filter('formatArray', ['OptionalInjection', function(OptionalInjection) {
  return function(value) {
    if (!angular.isArray(value)) return '';
    return value.map(OptionalInjection.formatter).join(', ');  // or just return value.join(', ');
  };




}]);






