var api_url = 'https://codeforces.com/api/';
var handle = '';

var verdicts = {};
var langs = {};
var tags = {};
var levels = {};
var ratings = {};
var problems = {};
var totalSub = 0;
var heatmap = {};
var heatmapData = {};
var years = 0;

var req1, req2;

var titleTextStyle = {
  fontSize: 18,
  color: '#393939',
  bold: false
};

google.charts.load('current', { packages: ['corechart', 'calendar'] });

$(document).ready(function () {
  // When the handle form is submitted, this function is called...
  $('#handleform').submit(function (e) {
    e.preventDefault();
    $('#handle').blur();
    resetData(); // When a new submission is made, clear all the previous data and graphs

    handle = $('#handle').val().trim();

    if (!handle) {
      err_message('handleDiv', 'Enter a name');
      $('#mainSpinner').removeClass('is-active');
      return; // No handle is provided, we can't do anything.
    }

    // getting all the submissions of a user
    req1 = $.get(api_url + 'user.status', { handle: handle }, function (data, status) {
     
      $('.sharethis').removeClass('hidden');

      if (data.result.length < 1) {
        err_message('handleDiv', 'No submissions');
        return;
      }

      // parsing all the submission and saving useful data. Don't remember why from the back
      for (var i = data.result.length - 1; i >= 0; i--) {
        var sub = data.result[i];
        
        // creating unique key for problem {contestID + problem name + problem rating}
        var rating;
        if (sub.problem.rating === undefined) {
          rating = 0;
        } else {
          rating = sub.problem.rating;
        }

        var problemId = sub.problem.contestId + '-' + sub.problem.name + '-' + rating;

        // previous id for removing duplicates
        var problemIdprev =
          sub.problem.contestId - 1 + '-' + sub.problem.name + '-' + rating;

        // next id for removing duplicates
        var problemIdnext =
          sub.problem.contestId + 1 + '-' + sub.problem.name + '-' + rating;

        // checking if problem previously visited
        if (problems[problemIdprev] !== undefined) {
          if (problems[problemIdprev].solved === 0) {
            problems[problemIdprev].attempts++;
          }
          problemId = problemIdprev;
        } else if (problems[problemIdnext] !== undefined) {
          if (problems[problemIdnext].solved === 0) {
            problems[problemIdnext].attempts++;
          }
          problemId = problemIdnext;
        } else if (problems[problemId] !== undefined) {
          if (problems[problemId].solved === 0) {
            problems[problemId].attempts++;
          }
        } else {
          problems[problemId] = {
            problemlink: sub.contestId + '-' + sub.problem.index, // link of problem
            attempts: 1,
            solved: 0, // We also want to save how many submission got AC, a better name would have been number_of_ac
            topics: sub.problem.tags
          };
        }

        if (sub.verdict == 'OK') {
          problems[problemId].solved++;
        }
        // modifying level, rating, and tag counter on first AC.
        if (problems[problemId].solved === 1 && sub.verdict == 'OK') {
          sub.problem.tags.forEach(function (t) {
            if (tags[t] === undefined) tags[t] = 1;
            else tags[t]++;
          });

          if (levels[sub.problem.index[0]] === undefined)
            levels[sub.problem.index[0]] = 1;
          else levels[sub.problem.index[0]]++;

          if (sub.problem.rating) {
            if (ratings[sub.problem.rating] === undefined) {
              ratings[sub.problem.rating] = 1;
            } else {
              ratings[sub.problem.rating]++;
            }
          }
        }

        // changing counter of verdict submission
        if (verdicts[sub.verdict] === undefined) verdicts[sub.verdict] = 1;
        else verdicts[sub.verdict]++;

        // changing counter of launguage submission
        if (langs[sub.programmingLanguage] === undefined)
          langs[sub.programmingLanguage] = 1;
        else langs[sub.programmingLanguage]++;

        //updating the heatmap
        var date = new Date(sub.creationTimeSeconds * 1000); // submission date
        date.setHours(0, 0, 0, 0);
        if (heatmap[date.valueOf()] === undefined) heatmap[date.valueOf()] = 1;
        else heatmap[date.valueOf()]++;
        totalSub = data.result.length;

        // how many years are there between first and last submission
        years =
          new Date(data.result[0].creationTimeSeconds * 1000).getYear() -
          new Date(
            data.result[data.result.length - 1].creationTimeSeconds * 1000
          ).getYear();
        years = Math.abs(years) + 1;
      }

      // finally draw the charts if google charts is already loaded,
      // if not set load callback to draw the charts
      if (typeof google.visualization === 'undefined') {
        google.charts.setOnLoadCallback(drawCharts);
      } else {
        drawCharts();
      }
    })
      .fail(function (xhr, status) {
        //console.log(xhr.status);
        if (status != 'abort') err_message('handleDiv', "Couldn't find user");
      })
      .always(function () {
        $('#mainSpinner').removeClass('is-active');
        $('.share-div').removeClass('hidden');
      });

  });

  // If there is a handle parameter in the url, we'll put it in the form
  // and automatically submit it to trigger the submit function, useful for sharing results
  handle = getParameterByName('handle');
  if (handle !== null) {
    $('#handle').val(handle);
    $('#handleform').submit();
  }
  $('#handleDiv').removeClass('hidden');

  // this is to update the heatmap when the form is submitted, contributed
  $('#heatmapCon input').keypress(function (e) {
    var value = $(this).val();
    //Enter pressed
    if (e.which == 13 && value >= 0 && value <= 999) {
      var heatmapOptions = {
        height: years * 140 + 30,
        width: Math.max($('#heatmapCon').width(), 900),
        fontName: 'Roboto',
        titleTextStyle: titleTextStyle,
        colorAxis: {
          minValue: 0,
          maxValue: value,
          colors: ['#ffffff', '#0027ff', '#00127d']
        },
        calendar: {
          cellSize: 15
        }
      };
      heatmap.draw(heatmapData, heatmapOptions);
    }
  });
});

function drawCharts() {

  //Plotting ratings
  $('#ratings').removeClass('hidden');
  var ratingTable = [];
  for (var rating in ratings) {
    ratingTable.push([rating, ratings[rating]]);
  }
  ratingTable.sort(function (a, b) {
    if (parseInt(a[0]) > parseInt(b[0])) return -1;
    else return 1;
  });
  ratings = new google.visualization.DataTable();
  ratings.addColumn('string', 'Rating');
  ratings.addColumn('number', 'solved');
  ratings.addRows(ratingTable);
  var ratingOptions = {
    width: Math.max($('#ratings').width(), ratings.getNumberOfRows() * 50),
    height: 300,
    title: 'Problem ratings of ' + handle,
    legend: 'none',
    fontName: 'Roboto',
    titleTextStyle: titleTextStyle,
    vAxis: { format: '0' },
    colors: ['#3F51B5']
  };
  var ratingChart = new google.visualization.ColumnChart(
    document.getElementById('ratings')
  );
  if (ratingTable.length > 1) ratingChart.draw(ratings, ratingOptions);

  //Plotting levels
  $('#languages').removeClass('hidden');
  var langBar = [];
  for (var lang in langs) {
    langBar.push([lang, langs[lang]]);
  }
  langBar.sort(function (a, b) {
    if (a[0] > b[0]) return -1;
    else return 1;
  });
  langs = new google.visualization.DataTable();
  langs.addColumn('string', 'Language');
  langs.addColumn('number', 'Solved');
  langs.addRows(langBar);
  var langOptions = {
    width: Math.max($('#languages').width(), langs.getNumberOfRows() * 50),
    height: 300,
    title: 'Languages: problems solved in each language by ' + handle,
    legend: 'none',
    fontName: 'Roboto',
    titleTextStyle: titleTextStyle,
    vAxis: { format: '0' },
    colors: ['#3F51B5']
  };
  var langChart = new google.visualization.ColumnChart(
    document.getElementById('languages')
  );
  if (langBar.length > 1) langChart.draw(langs, langOptions);

  //parse all the solved problems and extract some numbers about the solved problems
  var tried = 0;
  var unsolved = [];
  var unsolved_dict = {};
  for (var p in problems) {
    tried++;
    if (problems[p].solved === 0) {
      unsolved.push(problems[p].problemlink);
      problem_topics = problems[p].topics;
      for(var ind in problem_topics){
        if(unsolved_dict[problem_topics[ind]] === undefined){
          unsolved_dict[problem_topics[ind]] = [];
        }
        unsolved_dict[problem_topics[ind]].push(problems[p].problemlink);
      }
    }
  }
  
  console.log("Unsolved Dict:", unsolved_dict);

  $('#unsolvedCon').removeClass('hidden');
  us = ''
  for(topic in unsolved_dict){
    us = us + topic + ': <div>';
    for(var ind in unsolved_dict[topic]){
      if(ind == 20)
        break;
      p = unsolved_dict[topic][ind];
      var url = get_url(p);
      us = us + '<a href="' + url + '" target="_blank" class="lnk">' + p + '</a> &nbsp;&nbsp;';
    }
    us = us + '</div></br>';
  }
  $('#unsolvedList').append(us);
}

// reset all data
function resetData() {
  // if the requests were already made, abort them
  if (req1) req1.abort();
  if (req2) req2.abort();
  verdicts = {};
  langs = {};
  tags = {};
  levels = {};
  problems = {};
  totalSub = 0;
  heatmap = {};
  ratings = {};
  $('#mainSpinner').addClass('is-active');
  $('.to-clear').empty();
  $('.to-hide').addClass('hidden');
}

// receives the problem id like 650-A
// splits the contest id and problem index and returns the problem url
function get_url(p) {
  var con = p.split('-')[0];
  var index = p.split('-')[1];

  var url = '';
  if (con.length <= 4)
    url = 'https://codeforces.com/contest/' + con + '/problem/' + index;
  else url = 'https://codeforces.com/problemset/gymProblem/' + con + '/' + index;

  return url;
}

//Copied from stackoverflow :D gets url paramenter by name
function getParameterByName(name, url) {
  if (!url) {
    url = window.location.href;
  }
  name = name.replace(/[\[\]]/g, '\\$&');
  var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

// Opens a share window when the share button is clicked
function fbShareResult() {
  var url = window.location.href + '?handle=' + handle; // generation share url
  var top = screen.height / 2 - 150;
  var left = screen.width / 2 - 300;
  window.open(
    'https://facebook.com/sharer/sharer.php?u=' + escape(url),
    'Share',
    'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=300,width=600,top=' +
      top +
      ',left=' +
      left
  );
}

// shows am error message in the input form
// Needs the div name of the input widget
function err_message(div, msg) {
  $('#' + div + 'Err').html(msg);
  $('#' + div).addClass('is-invalid');
}
