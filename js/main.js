// ---------- Visualization
var Visualization = {

  svg: null,
  $legend: $("#legend"),
  playhead: null,
  dispatch: $('body'),
  data: [],

  data_schema: {
    B1dw:{title: "Blue Downwelling", color: "rgb(63, 169, 245)"},
    B1uw:{title: "Blue Upwelling", color: "rgb(60, 167, 221)"},
    B2dw:{title: "Green Downwelling", color: "rgb(122, 201, 67)"},
    B2uw:{title: "Green Upwelling", color: "rgb(112, 178, 61)"},
    B3dw:{title: "Yellow Downwelling", color: "rgb(252, 238, 33)"},
    B3uw:{title: "Yellow Upwelling", color: "rgb(229, 210, 32)"},
    B4dw:{title: "Red Downwelling", color: "rgb(255, 29, 37)"},
    B4uw:{title: "Red Upwelling", color: "rgb(234, 28, 44)"},
    B5dw:{title: "Red Edge Downwelling", color: "rgb(255, 123, 172)"},
    B5uw:{title: "Red Edge Upwelling", color: "rgb(234, 115, 163)"},
    B6dw:{title: "NIR0 Downwelling", color: "rgb(198, 198, 198)"},
    B6uw:{title: "NIR0 Upwelling", color: "rgb(178, 178, 178)"},
    B7dw:{title: "NIR1 Downwelling", color: "rgb(147, 147, 147)"},
    B7uw:{title: "NIR1 Upwelling", color: "rgb(127, 127, 127)"},
    LWdw:{title: "Longwave Energy Downwelling", color: "rgb(198, 156, 109)"},
    LWuw:{title: "Longwave Energy Upwelling", color: "rgb(166, 124, 82)"},
    PARdw:{title: "Photosynthetically Active Radiation Downwelling", color: "rgb(140, 98, 57)"},
    PARuw:{title: "Photosynthetically Active Radiation Upwelling", color: "rgb(117, 76, 36)"},
    SWdw:{title: "Shortwave Energy Downwelling", color: "rgb(96, 56, 19)"},
    SWuw:{title: "Shortwave Energy Upwelling", color: "rgb(66, 33, 11)"},
    Tabove:{title: "Sky Temperature", color: "rgb(46, 49, 146)"},
    Tair:{title: "Air Temperature", color: "rgb(41, 171, 226)"},
    Tbelow:{title: "Surface Temperature", color: "rgb(0, 169, 157)"},
    P:{title: "Barometric Pressure", color: "rgb(247, 147, 30)"},
    drops:{title: "Rain Drops", color: "rgb(0, 255, 255)"},
    RH:{title: "Relative Humidity", color: "rgb(102, 45, 145)"},
  },

  init: function() {

    d3.csv("data/arable_freshkills.csv", function(error, data) {
    
      if (error) throw error;

      Visualization.cleanData(data);
      Visualization.buildChart();
      Visualization.buildLegend();
    });

  },

  cleanData: function(data) {
    
    // Cast variables and delete unwanted columns
    data = _.map(data, function(d) {
    
      d.time = d3.isoParse(d.time);
      d = _.mapObject(d, function(val, key) {
        if(!isNaN(Number(val)) && key !== "time"){
          return Number(val);
        }
        return val;
      });
    
      delete d.deployment_id;
      delete d.device_id;
      delete d.group_id;
      delete d.dqs;
      delete d.lat;
      delete d.long;
      delete d.S_dw
      delete d.S_uw
    
      return d;
    
    });


    // Remove data that never changes
    var keys = Object.keys(data[0]);
    _.each(data, function(row){
      _.each(row, function(value, key){
        if(data[0][key] !== value){
           keys = _.without(keys, key);
        }
      });
    });
    _.each(data, function(row){
      _.each(row, function(value, key){
        if(keys.indexOf(key) > -1){
          delete row[key];
          delete Visualization.data_schema[key];
        }
      });
    });


    //Consolidate the rain data
    _.each(data, function(row){
      row.drops = 0;
      _.each(row, function(value, key){
        if(key.indexOf('Dsd') == 0) {
          row.drops += value;
          delete row[key];
        }
      }, this);
    }, this);


    _.chain(keys).filter(function(key){ return key.indexOf('Dsd') == 0; }).each(function(key){
      var drops = _.pluck(data,key);

       _.reduce(drops, function(memo, num){ return memo + num; }, 0);

      if(data[key]){
        drop_count += data[key];
      }
      delete data[key];
    });


    data.reverse();
    Visualization.data = data;

  },

  buildChart: function() {

    var width = $(window).width() - 32;
        height = 150;
    
    Visualization.svg = d3.select("svg")
      .attr("width", width)
      .attr("height", height + 20); //addition exposes x axis and legend
    Visualization.svg.append("g");
    
    _.each(Object.keys(Visualization.data[0]), function(data_type){
    
      // set the ranges
      var x = d3.scaleTime()
        .range([0, width])
        .domain(d3.extent(Visualization.data, function(d) { return d.time; }));
      var y = d3.scaleLinear().range([height, 0])
        .domain([d3.min(Visualization.data, function(d) { return d[data_type]; }), d3.max(Visualization.data, function(d) { return d[data_type]; })]);
    
      // define the line
      var valueline = d3.line()
        .curve(d3.curveBasis)
        .x(function(d) { return x(d.time); })
        .y(function(d) { return y(d[data_type]); });

      // If we're at the 'time' column, add an x axis instead of charting it
      if(data_type === "time") {
        Visualization.svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));
        return;
      }
    
      // Add the valueline path.
      var color = Visualization.data_schema[data_type].color;
      Visualization.svg.append("path")
          .data([Visualization.data])
          .attr('fill','none')
          .attr('stroke',color)
          .attr('data-type',data_type)
          .attr('stroke-width','1px')
          .attr("class", "line")
          .attr("d", valueline);
    
    });

    Visualization.dispatch.on('highlight', function(event, data){
    	if(data && data.data_type) {
    		Visualization.svg.selectAll("path:not([data-type='"+data.data_type+"'])").attr('opacity',.05); //.transition().duration(150).attr('opacity',.1);
    	} else {
    		Visualization.svg.selectAll("path").attr('opacity',1);
    	}
    });

  },

  buildLegend: function(){

  	_.each(Visualization.data_schema, function(value, key){
  		var $legend_item = $("<div class='data' data-type='"+key+"' style='background:"+value.color+"'> "+value.title+"</div>");

  		$legend_item.hover( function(){
  			Visualization.dispatch.trigger("highlight", [{data_type: $(this).data('type')}]);
  		}, function(){
  			Visualization.dispatch.trigger("highlight");
  		});

  		Visualization.$legend.append($legend_item);
  	});

  },

  getData: function(time, data_type){

    var y = d3.scaleLinear().range([0, 1])
      .domain([d3.min(Visualization.data, function(d) { return d[data_type]; }), d3.max(Visualization.data, function(d) { return d[data_type]; })]);

    var bisectTime = d3.bisector(function(d) { return d.time; }).left;
    var i = bisectTime(Visualization.data, time);
    var value = Visualization.data[i][data_type];

    return y(value);

  }

};


// ---------- MUSIC
var Music = {

  chromatics: function() { 
    return Tonal.range.chromatic(['C1','B1']).map(function(note){ return note.slice(0, -1) });
  },

  instrumentations: {
    orchestra: {title:"an orchestra", instruments:[1,9,17,41,57,65]},
    strings: {title:"strings", instruments:[41]},
    piano: {title:"a piano", instruments:[1]},
    piano_strings: {title:"pianos and strings", instruments:[1,41]}
  },

  play: function(bpm, octaves, key, scale, instrumentation) {

    var scale = Tonal.scale(key + " " + scale);
    var file = new Midi.File();

    // Prepare the notes to scale and map the data onto
    var full_scale = [];
    _(octaves).times(function(n){
      full_scale = full_scale.concat(
        scale.map(function(note){ return note + (n+2); })
      );
    }, this);
    var range = full_scale.length;

    // Prepare the Score
    var score = {};
    _.each(Object.keys(Visualization.data[0]), function(data_type){
      if(data_type !== 'time') {
        score[data_type] = [];
      }
    }, this);

    // Build the score
    _.each(Visualization.data, function(row){
      _.each(Object.keys(row), function(key) {
        if(key !== 'time') {

          var y = d3.scaleLinear().range([range, 1])
            .domain([d3.min(Visualization.data, function(d) { return d[key]; }), d3.max(Visualization.data, function(d) { return d[key]; })]);

          var note_number = Math.floor(y(row[key]));
          var note = full_scale[note_number-1];

          score[key].push(note);

        }
      }, this);
    }, this);

    _.each(Object.keys(Visualization.data[0]), function(data_type, i){
      if(data_type !== 'time') {

        var track = new Midi.Track();
        file.addTrack(track);
        track.setTempo(bpm);

        var note_duration = 64; // Time and duration are specified in "ticks", and there is a hardcoded value of 128 ticks per beat. This means that a quarter note has a duration of 128.
        var instruments = Music.instrumentations[instrumentation].instruments;
        var channel = (i%instruments.length); // There are only 16 channels
        track.instrument(channel, instruments[channel]);

        _.each(score[data_type], function(note, index){

          var previous_note = score[data_type][index-1];
          var next_note = score[data_type][index+1];

          if(previous_note != note) {
            var multiplier = 1;
            while(note == score[data_type][index+multiplier]) {
              multiplier++;
            }

            track.addNote(channel, note, note_duration*multiplier);
          }

        }, this);

      }
    }, this);

    Music.download(file.toBytes());

    App.$el.find('.button.loading').removeClass('loading');

  },

  stop: function() {

  },

  download: function(data) {
    var base64_data = btoa(data);
    document.location = 'data:audio/midi;base64,' + base64_data;
  }

}



// ---------- APP
/* DATA MODEL */
var Generation = Backbone.RelationalModel.extend({
    relations: [{
        type: 'HasMany',
        key: 'performances',
        relatedModel: 'Performance',
        reverseRelation: {
            key: 'generation'
        }
    }],

    initialize: function (options) {
        var generation = this;

        //Determine the winner and evolve others towards this number
        var previous_generation = Generations.last();
        if(previous_generation){

          // Get previous performances and rank them by the fitness of their installation, descending.
          previous_generation_performances = previous_generation.get('performances');
          previous_generation_performances.comparator = function( performance ){
            return( performance.get('installation').get('fitness') * -1 );
          };
          previous_generation_performances.sort();

          // First item (winner) should just be mutated
          var winner = previous_generation_performances.shift();
          var mutated_winner = Performance.mutate(winner, {installation: winner.get('installation'), generation: generation });

          // Last item (winner) should just killed off and replaced
          if(previous_generation_performances.length){
            var loser = previous_generation_performances.pop();
            var loser_installation = loser.get('installation');
            new Performance({installation: loser_installation, generation: generation });
          }

          // Pair and crossover the remainders
          while(previous_generation_performances.length){

            // If there's a leftover, just mutate it.
            if(previous_generation_performances.length == 1) {
              var leftover = previous_generation_performances.pop();
              var mutated_leftover = Performance.mutate(leftover, {installation: leftover.get('installation'), generation: generation });

              // 20% divided by fitness chance it dies
              var death_chance = (100 - mutated_leftover.get('installation').get('fitness'))/5;
              if(_.random(0, 100) <= death_chance) {
                mutated_leftover.reseed();
              }
            
            } else {

              // Randomly pick the breeders
              var mother = previous_generation_performances.shuffle()[0];
              previous_generation_performances.remove(mother.cid);
              var father = previous_generation_performances.shuffle()[0];
              previous_generation_performances.remove(father.cid);

              var children = Performance.crossover(mother, father, {installation: mother.get('installation'), generation: generation }, {installation: father.get('installation'), generation: generation });

              // 20% divided by fitness chance it dies
              var death_chance = (100 - children[0].get('installation').get('fitness'))/5;
              if(_.random(0, 100) <= death_chance) {
                children[0].reseed();
              }
              var death_chance = (100 - children[1].get('installation').get('fitness'))/5;
              if(_.random(0, 100) <= death_chance) {
                children[1].reseed();
              }

            }
          }

        }

        //Add random performance to installation with no performances
        var new_installations = Installations.chain().filter(function(installation){
          return installation.get('performances').length === 0;
        }).each(function(installation){
          new Performance({installation: installation, generation: generation });
        });

        Generations.add(generation);

    },

});

var GenerationsCollection = Backbone.Collection.extend({
  model: Generation
});
var Generations = new GenerationsCollection();

var Installation = Backbone.RelationalModel.extend({
    relations: [{
        type: 'HasMany',
        key: 'performances',
        relatedModel: 'Performance',
        reverseRelation: {
            key: 'installation'
        }
    }],

    initialize: function (options) {
        Installations.add(this);
        this.set({
          fitness: _.random(0, 100)
        });
    }
});

var InstallationsCollection = Backbone.Collection.extend({
  model: Installation
});
var Installations = new InstallationsCollection();

var Performance = Backbone.RelationalModel.extend({

    initialize: function (options) {
      Performances.add(this);

      this.reseed();

      this.set(options);

    },

    reseed: function(){

      this.set({
        bpm: _.random(60,260),
        octaves: _.random(2,6),
        scale: _.sample(Tonal.scale.names()),
        key: _.sample( Music.chromatics() ),
        instrumentation:  _.sample( Object.keys(Music.instrumentations) ),
      });
    }

  }, {

    mutate: function(original, options) {
      var mutant = original.clone();

      // 33% chance of using a new scale
      if(_.random(1,3) == 1) {
        mutant.set('scale', _.sample(Tonal.scale.names()));
      }

      // 10% of changing the key one chromatic step up
      // 10% of changing the key one chromatic step down
      var chromatics = Music.chromatics();
      var r = _.random(1,10);
      var current_key_index = chromatics.indexOf( mutant.get('key') );
      if(r == 1){
        current_key_index++;
        if(current_key_index >= chromatics.length){
          mutant.set('key', chromatics[0]);
        }else{
          mutant.set('key', chromatics[current_key_index]);
        }
      } else if(r == 2) {
        current_key_index--;
        if(current_key_index < 0){
          mutant.set('key', chromatics[chromatics.length-1]);
        }else{
          mutant.set('key', chromatics[current_key_index]);
        }
      }

      // Alter +/-3 BPM points, in keeping with the original range
      var new_bpm = mutant.get('bpm') + _.random(-3,3);
      new_bpm = Math.max(new_bpm, 60);
      new_bpm = Math.min(new_bpm, 260);
      mutant.set('bpm', new_bpm);

      // 10% of incrementing the number of octaves (or decrement if at max)
      // 10% of decrementing the number of octaves (or increment if at max)
      var new_octaves = mutant.get('octaves');
      var r = _.random(1,10);
      if(r == 1){
        new_octaves++;
        if(new_octaves > 6){
          new_octaves = 5;
        }
      } else if(r == 2) {
        new_octaves--;
        if(new_octaves < 2){
          new_octaves = 3;
        }
      }
      mutant.set('octaves', new_octaves);

      // 25% chance of new instrumentation
      if(_.random(1,4) == 1) {
        mutant.set('instrumentation', _.sample( Object.keys(Music.instrumentations)));
      }

      mutant.set(options);
      return mutant;
    },

    crossover: function(mother, father, daughter_options, son_options) {

      var daughter = mother.clone();
      var son = father.clone();

      // The child take the average bpm of the parents, and then son drifts back towards father based on his fitness, analogous for the other pair.
      var average_bpm = (mother.get('bpm')+father.get('bpm'))/2;
      var son_drift = (father.get('bpm') - average_bpm) * father.get('installation').get('fitness')/100;
      var son_bpm = Math.round(average_bpm + son_drift);
      var daughter_drift = (mother.get('bpm') - average_bpm) * mother.get('installation').get('fitness')/100;
      var daughter_bpm = Math.round(average_bpm + daughter_drift);

      // Same for Octaves
      var average_octaves = (mother.get('octaves')+father.get('octaves'))/2;
      var son_drift = (father.get('octaves') - average_octaves) * father.get('installation').get('fitness')/100;
      var son_octaves = Math.round(average_octaves + son_drift);
      var daughter_drift = (mother.get('octaves') - average_octaves) * mother.get('installation').get('fitness')/100;
      var daughter_octaves = Math.round(average_octaves + daughter_drift);

      son.set({
       key: mother.get('key'),
       scale: father.get('scale'),
       instrumentation: mother.get('instrumentation'),
       bpm: son_bpm,
       octaves: son_octaves
      });
      daughter.set({
       key: father.get('key'),
       scale: mother.get('scale'),
       instrumentation: father.get('instrumentation'),
       bpm: daughter_bpm,
       octaves: daughter_octaves
      });

      daughter.set(daughter_options);
      son.set(son_options);

      return [son, daughter];

    }

});

var PerformancesCollection = Backbone.Collection.extend({
  model: Performance
});
var Performances = new PerformancesCollection();

/* VIEWS */
var AppView = Backbone.View.extend({

  el: "#app_container",

  events: {
    "click #add_installation": "addInstallation",
    "click #add_generation": "addGeneration",
  },

  initialize: function() {},

  render: function() {},

  addInstallation: function () {

    $(this.el).removeClass('no-installations');

    var installation = new Installation();
    var view = new InstallationView({model: installation});
  },

  addGeneration: function () {

    $(this.el).removeClass('no-generations');


    if(!Installations.length){
      App.addInstallation();
    }
    var generation = new Generation();
    var view = new GenerationView({model: generation});

    Installations.each(function(installation){
      var fitness = installation.get('fitness');
      fitness += _.random(-5,5);
      fitness = Math.max(0, fitness);
      fitness = Math.min(100, fitness);
      installation.set('fitness',fitness);
    });
  }

});


var InstallationView = Backbone.View.extend({
  className: "installation",
  tagName: "div",

  bindings: {
    '.fitness': 'fitness',
  },

  initialize: function() {
    App.$el.find("header#appheader").append(this.$el);
    this.render();
    if (this.model) {
        this.model.on('change', function(m, e){
          if(!e.stickitChange) {
            this.render();
          }
        }, this);
    }
  },
  render: function(){
    var view = this;
    var source = $('#InstallationTemplate').html();
    var template = Handlebars.compile(source);
    var html = template({installation_number: Installations.indexOf(this.model)+1});
    
    view.$el.html(html);
    view.stickit();

    view.$el.find('input[type="range"]').rangeslider({
        polyfill: false,
        onSlideEnd: function(position, value) {
          view.model.set({fitness: value}, {silent: true});
        }
    });

    // Reset the horizontal scale.
    App.$el.find('input[type="range"]').trigger('resize');
  }
});

var GenerationView = Backbone.View.extend({
  className: "generation",
  tagName: "div",
  initialize: function() {
    App.$el.find("#performances").prepend(this.$el);
    this.render();
  },
  render: function() {
    var generation_number = Generations.indexOf(this.model);
    this.$el.html('<div class="generation-header">Generation<span>' + (generation_number + 1) + '</span></div>');
    var parentView = this;

    var performances = this.model.get('performances');
    performances.comparator = function( model ) {
      return Installations.indexOf(model.get('installation'));
    };
    performances.sort().each(function(performance){
        var view = new PerformanceView({parentView: parentView, model: performance});
    });
  }
});

var PerformanceView = Backbone.View.extend({
  className: "performance",
  tagName: "div",

  events: {
    "click .play": "togglePerformance",
  },

  initialize: function(options) {
    $(options.parentView.el).append(this.$el);
    this.model.bind('change', this.render, this);
    this.render();
  },
  togglePerformance: function() {
    var _this = this;
    this.$el.find('.button').addClass('loading').delay(1).queue(function(next){
      Music.play(_this.model.get('bpm'), _this.model.get('octaves'), _this.model.get('key'), _this.model.get('scale'), _this.model.get('instrumentation'));
      next();
    });

  },
  render: function(){
    var source = $('#PerformanceTemplate').html();
    var template = Handlebars.compile(source);

    var context = this.model.toJSON();
    context.instrumentation = Music.instrumentations[context.instrumentation].title;
    var html = template(context);

    this.$el.html(html);
    this.stickit();
  }
});

var App = new AppView();
Visualization.init();
