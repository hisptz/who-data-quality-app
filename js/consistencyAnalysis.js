
(function(){
	
	var app = angular.module('consistencyAnalysis', []);
	
	app.filter('startFrom', function() {
	    return function(input, start) {
	        start = +start; //parse to int
	        if (input) return input.slice(start);
	        else return input;
	    }
	});
	
	app.controller("ConsistencyAnalysisController", function(metaDataService, periodService, requestService, dataAnalysisService, mathService, $modal, $timeout, $scope) {
		var self = this;
			    
	    self.result = undefined;
	    self.mainResult = undefined;
	    self.itemsPerPage = 25;
	    self.hasVisual = false;
	         	    
		function init() {		
			self.alerts = [];
			self.chart = {};
			
			self.selectedObject = {};
			
			self.consistencyType = 'relation'; 
			self.relationshipType = 'equal';
			self.trendType = 'constant';
			self.consistencyCriteria = 20;
			
	    	self.dataSelection = {
	    		'deGroups': [],
	    		'indGroups': [],
	    		'a': {
	    			deGroupSelected : undefined,
	    			de : [],
	    			deSelected : undefined,
	    			deText: "",
	    			indGroupSelected : undefined,
	    			ind : [],
	    			indSelected : undefined,
	    			indText: "",
	    			type: 'de'
	    		},
	    		'b': {
	    			deGroupSelected : undefined,
	    			de: [],
	    			deSelected : undefined,
	    			deText: "",
	    			indGroupSelected : undefined,
	    			ind : [],
	    			indSelected : undefined,
	    			indText: "",
	    			type: 'de'
	    		}
			};
	    	
	    	metaDataService.getDataElementGroups().then(function(data) { 
	    		self.dataSelection.deGroups = data;
	    	});
			metaDataService.getIndicatorGroups().then(function(data) { 
				self.dataSelection.indGroups = data;
			});
			
	    	
	    	//ORGUNITS
	    	self.analysisOrgunits = [];
	    	self.userOrgunits = [];
	    	self.boundaryOrgunitSelected = undefined;
	    	
	    	self.ouSelected = null;
	    	self.ouSearchResult = [];
	    		    	
	    	metaDataService.getUserOrgunits().then(function(data) { 
	    		self.userOrgunits = data;
	    		self.boundarySelectionType = 0;
	    		self.boundaryOrgunitSelected = self.userOrgunits[0];
	    		self.filterLevels();
	    		self.orgunitUserDefaultLevel();
	    	});
	    	
	    	self.orgunitLevels = [];
	    	self.filteredOrgunitLevels = [];
	    	self.orgunitLevelSelected = undefined;
	    	metaDataService.getOrgunitLevels().then(function(data) { 
	    		self.orgunitLevels = data;
	    		
	    		self.lowestLevel = 0; 
	    		for (var i = 0; i < self.orgunitLevels.length; i++) {
	    			var level = self.orgunitLevels[i].level;
	    			if (level > self.lowestLevel) self.lowestLevel = level;
	    		}
	    		
	    		self.filterLevels();
	    		self.orgunitUserDefaultLevel();
	    	});
	    	
	    	
	    	self.orgunitGroups = [];
	    	self.orgunitGroupSelected = undefined;
	    	metaDataService.getOrgunitGroups().then(function(data) { 
	    		self.orgunitGroups = data;
	    	});
	    	
	    	
	    	//PERIODS
	    	self.periodTypes = [];
	    	self.periodTypes = periodService.getPeriodTypes();
	    	self.periodTypeSelected = self.periodTypes[4];
			self.filteredPeriodTypes = [];
			filterPeriodTypes();
	    	
	    	self.periodCount = [];	    	
	    	self.periodCounts = periodService.getPeriodCount();
	    	self.periodCountSelected = self.periodCounts[3];
	    	
			
	    	self.years = periodService.getYears();
	    	self.yearSelected = self.years[0];
	    	
	    	self.isoPeriods = [];
	    	
	    	self.currentDate = new Date();			
	    	self.date = {
	    		"startDate": moment().subtract(12, 'months'), 
	    		"endDate": moment()
	    	};
	    	
	    	self.getPeriodsInYear();	    		
	    	
	    	self.onlyNumbers = /^\d+$/;	    	
	    	self.userOrgunitLabel = "";
	    	    	
	    	//Accordion settings
	    	self.oneAtATime = true;
	    	self.status = {
	    	    isFirstOpen: true
	    	};
	    }

	
		/** PARAMETER SELECTION */	    	
	   	self.getPeriodsInYear = function() {
	   		self.periodsInYear = [];
	   		var isoPeriods = periodService.getISOPeriods(self.yearSelected.name.toString() + '-01-01', self.yearSelected.name.toString() + '-12-31', self.periodTypeSelected.id);
	   		for (var i = 0; i < isoPeriods.length; i++) {
	   			self.periodsInYear.push({
	   				'id': isoPeriods[i],
	   				'name': periodService.shortPeriodName(isoPeriods[i])
	   			});
	   		}   	
	   	}
	   	    
	    
		
		self.orgunitSearchModeSelected = function() {
			self.boundaryOrgunitSelected = undefined;
			self.orgunitLevelSelected = undefined;
		}
		
		
		self.orgunitUserModeSelected = function() {
			self.boundaryOrgunitSelected = self.userOrgunits[0];
			self.orgunitUserDefaultLevel();
		}
		
		
		self.orgunitUserDefaultLevel = function() {
			
			if (!self.boundaryOrgunitSelected || !self.filteredOrgunitLevels) return;
		
			var level = self.boundaryOrgunitSelected.level;
			for (var i = 0; i < self.filteredOrgunitLevels.length; i++) {
				if (self.filteredOrgunitLevels[i].level === (level+1)) {
					self.orgunitLevelSelected = self.filteredOrgunitLevels[i];
				}
			}
			
			if (self.filteredOrgunitLevels.length === 0) self.orgunitLevelSelected = undefined;
		
		}
		
		function lowestLevel() {
		
			var lowest = 1;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level > lowest) {
					lowest = self.orgunitLevels[i].level;
				}
			}
			
			return lowest;
		}
				
		
		self.filterLevels = function() {
			self.filteredOrgunitLevels = [];
			
			if (!self.orgunitLevels || !self.boundaryOrgunitSelected) return;
			for (var i = 0; i < self.orgunitLevels.length; i++) {
				if (self.orgunitLevels[i].level > self.boundaryOrgunitSelected.level) {
					self.filteredOrgunitLevels.push(self.orgunitLevels[i]);
				}
			}			
		}
		
				
		self.getLevelPlaceholder = function() {
			if (!self.filteredOrgunitLevels || self.filteredOrgunitLevels.length === 0) {
				if (self.boundaryOrgunitSelected && self.boundaryOrgunitSelected.level === self.lowestLevel) return "N/A";
				else return "Loading...";
			
			}
			else return "Select level";
		}
		
		
	    self.orgunitSearch = function(searchString){
	        if (searchString.length >= 3) {
	    		var requestURL = "/api/organisationUnits.json?filter=name:like:" + searchString + "&paging=false&fields=name,id,level";
	    		requestService.getSingle(requestURL).then(function (response) {

					//will do with API filter once API-filter is stable
	    			var orgunits = response.data.organisationUnits;
	    			var lowest = lowestLevel();
	    			self.ouSearchResult = [];
	    			for (var i = 0; i < orgunits.length; i++) {
	    				if (orgunits[i].level < lowest) {
		    				self.ouSearchResult.push(orgunits[i]);
		    			}
	    			}
	    			
	    		});
	    	}
	    }
		
	
	    self.updateDataElementList = function(dataItem) {
	    	self.dataSelection[dataItem].de = [];
	    	self.dataSelection[dataItem].deSelected = undefined;
	    	
	    	if (self.dataSelection[dataItem].type === 'de') {	    	
	    		self.dataSelection[dataItem].deText = "Loading...";
		    	metaDataService.getDataElementGroupMembers(self.dataSelection[dataItem].deGroupSelected.id)
		    	 	.then(function(data) { 

		    	       	self.dataSelection[dataItem].deText = "Select data element...";
		    	       	self.dataSelection[dataItem].de = data;
		    	       	if (dataItem == 'a' && !self.dataSelection['b'].de) {
							self.dataSelection['b'].deText = "Select data element...";
							self.dataSelection['b'].de = data;		    	       		
		    	       	}
		    	     });
	    	}
	    	else {
	    		self.dataSelection[dataItem].deText = "Loading...";
	    		metaDataService.getDataElementGroupMemberOperands(self.dataSelection[dataItem].deGroupSelected.id)
	    		 	.then(function(data) { 
		    	       	self.dataSelection[dataItem].deText = "Select data element...";    		 		
	    		       	self.dataSelection[dataItem].de = data;
	    		       	
	    		       	if (dataItem == 'a' && !self.dataSelection['b'].deGroupSelected) {
	    		       		self.dataSelection['b'].deGroupSelected = angular.copy(self.dataSelection['a'].deGroupSelected);
	    		       		self.dataSelection['b'].deText = "Select data element...";
	    		       		self.dataSelection['b'].de = data;		    	       		
	    		       	}
	    		     });
	    	}
	    
	    }
	    
	    self.dataSelected = function (itemType, itemCode) {
	    	if (itemType === 'de') {
		    	metaDataService.getDataElementPeriodType(self.selectedData(itemCode).id).then(function (periodType) {
		    		self.dataSelection[itemCode].periodType = periodType;
		    		filterPeriodTypes();
		    	});
		    }
		    else {
		    	metaDataService.getIndicatorPeriodTypes(self.selectedData(itemCode).id).then(function (periodTypeObject) {
		    		console.log(periodTypeObject);
		    		self.dataSelection[itemCode].periodType = periodTypeObject.longest;
		    		filterPeriodTypes();
		    	});
		    }
		    
	    }
	    
	    
	    function filterPeriodTypes() {
	    	
	    	if (!self.dataSelection['a'].periodType && !self.dataSelection['b'].periodType) {
	    		self.filteredPeriodTypes = self.periodTypes;
	    		return;
	    	}
	    	var periods = [];
	    	if (self.dataSelection['a'].periodType) periods.push(self.dataSelection['a'].periodType);
	    	if (self.consistencyType === 'relation' && self.dataSelection['b'].periodType) periods.push(self.dataSelection['b'].periodType);

	    	var longestPeriod = periodService.longestPeriod(periods);
	    	
	    	self.filteredPeriodTypes = [];
	    	for (var i = self.periodTypes.length-1; i >= 0; i--) {
	    		
	    		if (self.periodTypes[i].id === longestPeriod) {
	    			self.filteredPeriodTypes.push(self.periodTypes[i]);
	    			break;	
	    		}
	    		else {
	    			self.filteredPeriodTypes.push(self.periodTypes[i]);
	    		}
	    	}
	    	self.periodTypeSelected = self.filteredPeriodTypes[self.filteredPeriodTypes.length-1];
	    	self.getPeriodsInYear();
	    }
	    
	    
  	    self.updateIndicatorList = function(dataItem) {
  	    	self.dataSelection[dataItem].ind = [];
	   		self.dataSelection[dataItem].indSelected = undefined;
  	    	self.dataSelection[dataItem].indText = "Loading...";
  	    	metaDataService.getIndicatorGroupMembers(self.dataSelection[dataItem].indGroupSelected.id)
  	    		.then(function(data) { 
  	    			self.dataSelection[dataItem].indText = "Select indicator";  	    			
  	    		   	self.dataSelection[dataItem].ind = data;
  	    		});
  	    }
  	    
  	    self.selectedPeriod = function() {
  	    	if (self.periodTypeSelected.id != 'Yearly') return self.periodSelected;
  	    	else return self.yearSelected;
  	    }
  	    
  	    //item a or b
  	    self.selectedData = function(item) {
	  	    
	  	    //var get data id(s)
	  	    var dx;
	  	    if (self.dataSelection[item].type === 'de') {
	  	    	return self.dataSelection[item].deSelected;
	  	    }
	  	    else {
	  	    	return self.dataSelection[item].indSelected;
	  	    }
  	    }
			
		
		
		/** REQUEST DATA */		
		self.doAnalysis = function() {
			
			//Collapse open panels
			$('.panel-collapse').removeClass('in');

			self.mainResult = undefined;
			self.result;
			
			var analysisType = self.consistencyType;
			var relationType = self.relationshipType;
			var trendType = self.trendType;
			var criteria = self.consistencyCriteria;


			var period = self.selectedPeriod().id;
			var dxA = self.selectedData('a').id;
			var dxB = self.selectedData('b').id;
			var ouBoundary = self.boundaryOrgunitSelected.id;
			var ouLevel = self.orgunitLevelSelected.level;
			var ouGroup = null;//TODO			
			
			if (self.orgunitLevelSelected) {
				ouLevel = self.orgunitLevelSelected.level;
				console.log("Depth: " + (ouLevel-self.boundaryOrgunitSelected.level));
			}
			
			//1 Relation
			if (analysisType = 'relation') {	
				dataAnalysisService.dataConsistency(receiveRelationResult, relationType, criteria, null, dxA, dxB, period, ouBoundary, ouLevel)
			}
			
		};
		
		
		function dataForSelectedUnit(ouID) {
		
			console.log(self.dataSelection);
						
		}
		
	
		
		/**
		RESULTS
		*/
		
		var receiveRelationResult = function(result, errors) {
		
			if (result.type === 'do') {
				makeDropoutRateChart(result);
			}
			else {
				makeDataConsistencyChart(result);
			}
			
			self.chart.data = result.chartData;
			self.chart.options = result.chartOptions;		
			
			self.updateCharts();
			
			self.mainResult = result;
			
			self.currentPage = 1;
			self.pageSize = 15;   	
			self.totalRows = self.mainResult.subunitDatapoints.length;
			
			self.sortByColumn('ratio');
			if (result.type === 'do') self.sortByColumn('ratio'); //Want descending if dropout
			
			//Look for click events in chart
			$(document).on("click", "svg", function(e) {
			     
			     var item = e.target.__data__;
			     if( Object.prototype.toString.call(item) === '[object Object]' ) {
			         if (item.hasOwnProperty('series') && item.hasOwnProperty('point')) {
			         	itemClicked(item.series, item.point);
			         }
			     }
			     
			});
		}
		
	
		self.title = function () {
			var title = "";
			if (self.consistencyType === 'relation') {			
				title += self.selectedData('a').name + " to " + self.selectedData('b').name + " for " + self.selectedPeriod().name;
			}
			
			return title;
		}
				
       	
       	/** DATA FUNCTION */
       	self.dropoutRate = function(valueA, valueB) {
       	
       		return mathService.round(100*(valueA-valueB)/valueA, 2);
       	
       	}
       	
	    
	   	
	   	
	   	/** TABLE LAYOUT */
	   	self.sortByColumn = function (columnKey) {
	   		self.currentPage = 1;
	   		if (self.sortCol === columnKey) {
	   			self.reverse = !self.reverse;
	   		}
	   		else {
	   			self.sortCol = columnKey;
	   			self.reverse = true;
	   		}
	   	}
	   	
	   	self.isOutlier = function (value, stats) {
	   		if (value === null || value === '') return false;
	   		
   			var standardScore = Math.abs(mathService.calculateStandardScore(value, stats));
   			var zScore = Math.abs(mathService.calculateZScore(value, stats));
   			
   			if (standardScore > 2 || zScore > 3.5) return true;
   			else return false;
   		}
   		
	   	
   		self.updateFilter = function() {
   			self.filteredRows = [];
   			for (var i = 0; i < self.result.rows.length; i++) {
   				if (includeRow(self.result.rows[i])) {
   					self.filteredRows.push(self.result.rows[i]);
   				}
   			}
   			
   			//Store paging variables
   			self.currentPage = 1;
   			self.pageSize = 15;   	
   			self.totalRows = self.filteredRows.length;
   		}
   		
   		
   		function includeRow(row) {
   				
   				if (self.stdFilterType === 0) return true;
   				
   				if (self.stdFilterType === 1) {
   					if (self.stdFilterDegree === 2) return row.result.maxSscore > 3;
   					else return row.result.maxSscore > 2;
   				}
   				
   				if (self.stdFilterType === 2) {
   					if (self.stdFilterDegree === 2) return row.result.maxZscore > 5;
   					else return row.result.maxZscore > 3.5;
   				} 
   				
   				return false;
   			}
   		
   		
	   	
	   	/**INTERACTIVE FUNCTIONS*/
	   	
	   	
	   	function itemClicked(seriesIndex, pointIndex) {	   		
	   		self.selectOrgunit(self.mainResult.subunitDatapoints[pointIndex]);
	   		$scope.$apply();
	   	}
	   	
	   	
	   	self.selectOrgunit = function(item) {
	   		self.selectedObject.name = item.name;
	   		self.selectedObject.id = item.id;
	   		self.selectedObject.value = item.value;
	   		self.selectedObject.refValue = item.refValue;
	   		self.selectedObject.ratio = item.ratio;
	   		
	   		dataForSelectedUnit(item.id);
	   	}
	   	
        
        self.sendMessage = function(row) {
        	        	
        	var modalInstance = $modal.open({
	            templateUrl: "views/_modals/modalMessage.html",
	            controller: "ModalMessageController",
	            controllerAs: 'mmCtrl',
	            resolve: {
	    	        orgunitID: function () {
	    	            return row.id;
	    	        },
	    	        orgunitName: function () {
	    	            return row.name;
	    	        }
	            }
	        });
	
	        modalInstance.result.then(function (result) {
	        });
        }
        
        
        self.drillDown = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ouID + ".json?fields=children[id]";
        	requestService.getSingle(requestURL).then(function (response) {
        		
        		
        		var children = response.data.children;
        		if (children.length > 0) {
        		
					var orgunits = [];
					for (var i = 0; i < children.length; i++) {
						orgunits.push(children[i].id);
					}
					self.result.metaData.parameters.OUlevel = undefined;
					self.result.metaData.parameters.OUgroup = undefined;
					

					
					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
					
					self.result = null;
					
        		}
        		        		
        		else {
        			self.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have any children'});
        		}
        	});
        	
        	
        }

        
        self.floatUp = function (rowMetaData) {
        	
        	var requestURL = "/api/organisationUnits/" + rowMetaData.ouID + ".json?fields=parent[id,children[id],parent[id,children[id]]";
        	requestService.getSingle(requestURL).then(function (response) {

        		var metaData = response.data;
        		if (metaData.parent) {
        			
        			var orgunits = [metaData.parent.id];
        			self.result.metaData.parameters.OUlevel = undefined;
        			self.result.metaData.parameters.OUgroup = undefined;

					

					dataAnalysisService.outlier(receiveResultNew, self.result.metaData.variables, self.result.metaData.periods, orgunits, self.result.metaData.parameters);
					
					self.result = null;
        		}
        		else {
					self.alerts.push({type: 'warning', msg: rowMetaData.ouName + ' does not have a parent'});
        		}
        		
        		
        		
        	});
        	
        	
        }
        
        /** CHARTS */
  	  	function makeTimeConsistencyChart(result) {	    		    	
  	  		    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.threshold; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    		
	    		var toolTipHTML = '<h3>' + data[graph.pointIndex].name + '</h3>';
    			toolTipHTML += '<p style="margin-bottom: 0px">' + result.pe + ': ' + y + '</p>';
	    		if (result.type === 'constant') {
	    			toolTipHTML += '<p>Average: ' + x + '</p>'; 	    			
	    		}
	    		else {
	    			toolTipHTML += '<p>Forecasted: ' + x + '</p>'; 	    			
	    		}
	    	    return toolTipHTML;
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': self.boundaryOrgunitSelected.name,
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#00F',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    		    	
			var xAxisLabel;
			if (result.type === "constant") xAxisLabel = "Average of previous periods";
			else xAxisLabel = "Forecasted value";
			
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 600,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 100,
	    	          "left": 50
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": xAxisLabel,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": result.pe,
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
	    	        
	    	    },
	    	    "title": {
	    	    	'enable': true,
	    	    	'text': result.dxName
	    	    },
	    	    "subtitle": {
	    	    	'enable': false
	    	    }
	    	};
	    	
	    	result.chartData = chartSeries;
	    }
  	  	
  	  		    
	    function makeDataConsistencyChart(result) {	    		    	
	    
	    	var datapoints = result.subunitDatapoints;
	    	var boundaryRatio = result.boundaryRatio;
	    	var consistency = result.criteria; 
	    		    	
	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[graph.pointIndex].name + '</h3>' +
	    	        '<p style="margin-bottom: 0px">' + result.dxNameA + ': ' + y + '</p>' + 
	    	        '<p>' + result.dxNameB + ': ' + x + '</p>'; 
	    	};
	    	
	    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}
	    	
	    	for (var i = 0; i < datapoints.length; i++) {
	    		chartSerie.values.push({
	    			'x': datapoints[i].refValue,
	    			'y': datapoints[i].value
	    		});
	    	}

	    	chartSeries.push(chartSerie);
	    	chartSeries.push(
	    		{
	    			'key': self.boundaryOrgunitSelected.name,
	    			'color': '#ffff',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "+ " + consistency + "%",
	    			'color': '#F00',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio+consistency/100,
	    			'intercept': 0.001
	    		},
	    		{
	    			'key': "- " + consistency + "%",
	    			'color': '#00F',
	    			'values': [{
	    			'x': 0,
	    			'y': 0,
	    			'size': 0
	    			}
	    			],
	    			'slope': boundaryRatio-consistency/100,
	    			'intercept': 0.001
	    		}
	    	);
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "scatterChart",
	    	        "height": 600,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 120,
	    	          "left": 120
	    	        },
	    	        "scatter": {
	    	        	"onlyCircles": false
	    	        },
	    	        "clipEdge": false,
	    	        "staggerLabels": true,
	    	        "transitionDuration": 1,
	    	        "showDistX": true,
	    	        "showDistY": true,
	    	        "xAxis": {
	    	              "axisLabel": result.dxNameA,
	    	              "axisLabelDistance": 30,
	    	              "tickFormat": d3.format('g')
	    	        },
	    	        "yAxis": {
	    	        	"axisLabel": result.dxNameB,
	    	            "axisLabelDistance": 30,
	    	            "tickFormat": d3.format('g')
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip
	    	    }
	    	};
	    	
	    	result.chartData = chartSeries;
	    }
	    
	    
	    function makeDropoutRateChart(result) {	    		    	
	    	var chartSeries = [];
	    	var chartSerie = {
	    		'key': self.orgunitLevelSelected.name + "s",
	    		'values': []
	    	}

	    	var toolTip = function(key, x, y, e, graph) {
	    		var data = result.subunitDatapoints;
	    	    return '<h3>' + data[x].name + '</h3>' +
	    	        '<p>' +  mathService.round(100*(data[x].value-data[x].refValue)/data[x].value,1)  + '% dropout</p>'
	    	};
	    	
	    	var minVal = 0.9;
	    	var maxVal = 2;
	    	var point, value;
	    	for (var i = 0; i < result.subunitDatapoints.length; i++) {
	    		point = result.subunitDatapoints[i];
	    		value = point.value/point.refValue;
	    		
	    		if (value > maxVal) maxVal = value;
	    		else if (value < minVal) minVal = value;
	    		
	    		chartSerie.values.push({
	    			'x': i,
	    			'y': mathService.round(value, 2)
	    		});
	    	}

	    	chartSeries.push(chartSerie);	    	
	    	result.chartData = chartSeries;    	
	    	
	    	result.chartOptions = {
	    	   	"chart": {
	    	        "type": "lineChart",
	    	        "height": 600,
	    	        "margin": {
	    	          "top": 10,
	    	          "right": 30,
	    	          "bottom": 120,
	    	          "left": 120
	    	        },
	    	        "xAxis": {
	    	          "showMaxMin": false,
	    	          'axisLabel': axisLabel = self.orgunitLevelSelected.name + "s"
	    	        },
	    	        "yAxis": {
	    	          "axisLabel": "Ratio"
	    	        },
	    	        'tooltips': true,
	    	        'tooltipContent': toolTip,
	    	        'showLegend': true,
	    	      	'forceY': [Math.floor(minVal*10)/10, Math.ceil(maxVal*10)/10]
	    	    }
	    	}
	    }
	   	
	   	
	   	/** UTILITIES */
	   	function uniqueArray(array) {
	   	    var seen = {};
	   	    return array.filter(function(item) {
	   	        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
	   	    });
	   	}
	   	
	   	self.updateCharts = function() {
	   		$timeout(function() {
	   			for (var i = 0; i < nv.graphs.length; i++) {
	   				nv.graphs[i].update();
	   			}
	   			window.dispatchEvent(new Event('resize'));
	   		});
	   	}
	   	
	   	        
		init();
    	
		return self;
	});
	
})();

