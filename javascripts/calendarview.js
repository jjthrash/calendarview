//
// CalendarView (for Prototype)
// calendarview.org
//
// Maintained by Justin Mecham <justin@aspect.net>
//
// Portions Copyright 2002-2005 Mihai Bazon
//
// This calendar is based very loosely on the Dynarch Calendar in that it was
// used as a base, but completely gutted and more or less rewritten in place
// to use the Prototype JavaScript library.
//
// As such, CalendarView is licensed under the terms of the GNU Lesser General
// Public License (LGPL). More information on the Dynarch Calendar can be
// found at:
//
//   www.dynarch.com/projects/calendar
//


/* This branch by Yuri Leikind ( git://github.com/leikind/calendarview.git ) adds the following features/changes:

* Time for dealing with two dropdowns for hours and minutes,  (yuri dot leikind at gmail.com )
* Refactoring, cleaner OO design : 
  * Getting rid of things like 
      Calendar.prototype = {
    point is: why use Prototype's Class.create() together with Calendar.prototype, add static members to it 
    like Calendar._checkCalendar = function(event) and we end up having a perfect mess of all possible approaches
  * Getting rid of DynArch legacy as Calendar.setup({}) in favor of a clean and simple new Calendar({}).
    This also changes the behavior of popup calendars -  they are not created every time they pop up, on the contrary,
    they are created once just like embedded calendars, and then shown or hidden.

*/



var Calendar = Class.create({

  // The HTML Container Element
  container: null,

  // Configuration
  minYear: 1900,
  maxYear: 2100,

  // Dates
  date: new Date(),
  currentDateElement: null,

  // Status
  shouldClose: false,
  isPopup: true,

  initialize: function(params){
    
    parentElement  = params.parentElement  || null; // just get rid of indefined 'values' :)
    withTime       = params.withTime       || null;
    dateFormat     = params.dateFormat     || null;
    dateField      = params.dateField      || null;
    triggerElement = params.triggerElement || null;
    closeHandler   = params.closeHandler   || null;
    selectHandler  = params.selectHandler  || null;    
    
    if (parentElement){
      this.parentElement = $(parentElement);
    }else{
      this.parentElement = null;
    }

    this.withTime      = withTime;

    if (dateFormat){
      this.dateFormat = dateFormat;
    }else{
      if(this.withTime){
        this.dateFormat = Calendar.defaultDateTimeFormat;
      }else{
        this.dateFormat = Calendar.defaultDateFormat;
      }
    }

    this.build();

    this.selectHandler = selectHandler || Calendar.defaultSelectHandler;

    if (dateField) {
      this.dateField = $(dateField);
      this.parseDate(this.dateField.innerHTML || this.dateField.value)
    }


    if (this.isPopup) { //Popup Calendars
      var triggerElement = $(triggerElement || dateField);
      this.closeHandler = closeHandler || Calendar.defaultCloseHandler;

      
      triggerElement.onclick = function() {
        this.showAtElement(triggerElement)
      }.bind(this);
      
    } else{ // In-Page Calendar
      this.show();
    }
      
  },

  // Build the DOM structure
  build: function(){
    // If no parent was specified, assume that we are creating a popup calendar.
    if (this.parentElement) {
      parent = this.parentElement;
      this.isPopup = false;
    } else {
      parent = document.getElementsByTagName('body')[0];
      this.isPopup = true;
    }

    // Calendar Table
    var table = new Element('table')

    // Calendar Header
    var thead = new Element('thead')
    table.appendChild(thead)

    // Title Placeholder
    var row  = new Element('tr')
    var cell = new Element('td', { colSpan: 7 } )
    cell.addClassName('title')
    row.appendChild(cell)
    thead.appendChild(row)

    // Calendar Navigation
    row = new Element('tr')
    this._drawButtonCell(row, '&#x00ab;', 1, Calendar.NAV_PREVIOUS_YEAR)
    this._drawButtonCell(row, '&#x2039;', 1, Calendar.NAV_PREVIOUS_MONTH)
    this._drawButtonCell(row, 'Today',    3, Calendar.NAV_TODAY)
    this._drawButtonCell(row, '&#x203a;', 1, Calendar.NAV_NEXT_MONTH)
    this._drawButtonCell(row, '&#x00bb;', 1, Calendar.NAV_NEXT_YEAR)
    thead.appendChild(row)

    // Day Names
    row = new Element('tr')
    for (var i = 0; i < 7; ++i) {
      cell = new Element('th').update(Calendar.SHORT_DAY_NAMES[i])
      if (i == 0 || i == 6)
        cell.addClassName('weekend')
      row.appendChild(cell)
    }
    thead.appendChild(row)

    // Calendar Days
    var tbody = table.appendChild(new Element('tbody'))
    for (i = 6; i > 0; --i) {
      row = tbody.appendChild(new Element('tr'))
      row.addClassName('days')
      for (var j = 7; j > 0; --j) {
        cell = row.appendChild(new Element('td'))
        cell.calendar = this
      }
    }

    // Time Placeholder
    if (this.withTime){
      var tfoot = table.appendChild(new Element('tfoot'))
      row = tfoot.appendChild(new Element('tr'))
      cell = row.appendChild(new Element('td', { colSpan: 7 }))
      cell.addClassName('time')
      var hourSelect = cell.appendChild(new Element('select', { name : 'hourSelect'}))
      for (var i = 0; i < 24; i++) {
        hourSelect.appendChild(new Element('option', {value : i}).update(i))
      }
  
      cell.appendChild(new Element('span')).update(' : ')
  
      var minuteSelect = cell.appendChild(new Element('select', { name : 'minuteSelect'}))
      for (var i = 0; i < 60; i++) {
        minuteSelect.appendChild(new Element('option', {value : i}).update(i))
      }
    
      hourSelect.observe('change', function(event){
        selectedIndex = event.element().selectedIndex
        if (selectedIndex){
          this.date.setHours(selectedIndex);
          this.updateOuterField();
        }
      }.bind(this))

      minuteSelect.observe('change', function(event){
        selectedIndex = event.element().selectedIndex
        if (selectedIndex){
          this.date.setMinutes(selectedIndex)
          this.updateOuterField();
        }
      }.bind(this))
    
    }

    // Calendar Container (div)
    this.container = new Element('div')
    this.container.addClassName('calendar')
    if (this.isPopup) {
      this.container.setStyle({ position: 'absolute', display: 'none' })
      this.container.addClassName('popup')
    }
    this.container.appendChild(table)

    // Initialize Calendar
    this.update(this.date)

    // Observe the container for mousedown events
    Event.observe(this.container, 'mousedown', Calendar.handleMouseDownEvent)

    // Append to parent element
    parent.appendChild(this.container)
    
  },

  updateOuterField: function(){
    if (this.dateField.tagName == 'DIV')
      this.dateField.update(this.date.print(this.dateFormat))
    else if (this.dateField.tagName == 'INPUT') {
      this.dateField.value = this.date.print(this.dateFormat) }
  },
  

  //----------------------------------------------------------------------------
  // Update  Calendar
  //----------------------------------------------------------------------------

  update: function(date)
  {
    var calendar   = this
    var today      = new Date()
    var thisYear   = today.getFullYear()
    var thisMonth  = today.getMonth()
    var thisDay    = today.getDate()
    var month      = date.getMonth();
    var dayOfMonth = date.getDate();
    var hour       = date.getHours();
    var minute     = date.getMinutes();
    
    // Ensure date is within the defined range
    if (date.getFullYear() < this.minYear)
      date.__setFullYear(this.minYear)
    else if (date.getFullYear() > this.maxYear)
      date.__setFullYear(this.maxYear)

    this.date = new Date(date)

    // Calculate the first day to display (including the previous month)
    date.setDate(1)
    date.setDate(-(date.getDay()) + 1)

    // Fill in the days of the month
    Element.getElementsBySelector(this.container, 'tbody tr').each(
      function(row, i) {
        var rowHasDays = false
        row.immediateDescendants().each(
          function(cell, j) {
            var day            = date.getDate()
            var dayOfWeek      = date.getDay()
            var isCurrentMonth = (date.getMonth() == month)

            // Reset classes on the cell
            cell.className = ''
            cell.date = new Date(date)
            cell.update(day)

            // Account for days of the month other than the current month
            if (!isCurrentMonth)
              cell.addClassName('otherDay')
            else
              rowHasDays = true

            // Ensure the current day is selected
            if (isCurrentMonth && day == dayOfMonth) {
              cell.addClassName('selected')
              calendar.currentDateElement = cell
            }

            // Today
            if (date.getFullYear() == thisYear && date.getMonth() == thisMonth && day == thisDay)
              cell.addClassName('today')

            // Weekend
            if ([0, 6].indexOf(dayOfWeek) != -1)
              cell.addClassName('weekend')

            // Set the date to tommorrow
            date.setDate(day + 1)
          }
        )
        // Hide the extra row if it contains only days from another month
        !rowHasDays ? row.hide() : row.show()
      }
    )

    Element.getElementsBySelector(this.container, 'tfoot tr td select').each(
      function(sel){
        if(sel.name == 'hourSelect'){
          sel.selectedIndex = hour
        }else if(sel.name == 'minuteSelect'){
          sel.selectedIndex = minute
        }
      }
    )

    this.container.getElementsBySelector('td.title')[0].update(
      Calendar.MONTH_NAMES[month] + ' ' + this.date.getFullYear()
    )
  },


  _drawButtonCell: function(parent, text, colSpan, navAction)
  {
    var cell          = new Element('td')
    if (colSpan > 1) cell.colSpan = colSpan
    cell.className    = 'button'
    cell.calendar     = this
    cell.navAction    = navAction
    cell.innerHTML    = text
    cell.unselectable = 'on' // IE
    parent.appendChild(cell)
    return cell
  },



  //------------------------------------------------------------------------------
  // Callbacks
  //------------------------------------------------------------------------------

  // Calls the Select Handler (if defined)
  callSelectHandler: function() {
    if (this.selectHandler)
      this.selectHandler(this, this.date.print(this.dateFormat))
  },

  // Calls the Close Handler (if defined)
  callCloseHandler: function(){
    if (this.closeHandler)
      this.closeHandler(this)
  },



  //------------------------------------------------------------------------------
  // Calendar Display Functions
  //------------------------------------------------------------------------------

  show: function(){
    this.container.show()
    if (this.isPopup) {
      window._popupCalendar = this
      Event.observe(document, 'mousedown', Calendar._checkCalendar)
    }
  },

  // Shows the calendar at the given absolute position
  showAt: function (x, y) {
    this.container.setStyle({ left: x + 'px', top: y + 'px' });
    this.show();
  },

  // Shows the Calendar at the coordinates of the provided element
  showAtElement: function(element) {
    var pos = Position.cumulativeOffset(element);
    
    this.container.show();
    this.showAt(pos[0], pos[1] );//+ (this.container.offsetHeight * 0.75))
  },

  // Hides the Calendar
  hide: function() {
    if (this.isPopup)
      Event.stopObserving(document, 'mousedown', Calendar._checkCalendar)
    this.container.hide()
  },


  // Tries to identify the date represented in a string.  If successful it also
  // calls this.updateIfDateDifferent which moves the calendar to the given date.
  parseDate: function(str, format){
    if (!format)
      format = this.dateFormat
    this.updateIfDateDifferent(Date.parseDate(str, format))
  },


  updateIfDateDifferent: function(date) {
    if (!date.equalsTo(this.date))
      this.update(date);
  },


  setRange: function(minYear, maxYear) {
    this.minYear = minYear;
    this.maxYear = maxYear;
  }
})



//------------------------------------------------------------------------------
// Constants
//------------------------------------------------------------------------------

Calendar.VERSION = '1.2';

Calendar.defaultDateFormat = '%Y-%m-%d';
Calendar.defaultDateTimeFormat = '%Y-%m-%d %H:%M';

Calendar.DAY_NAMES = new Array(
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  'Sunday'
);

Calendar.SHORT_DAY_NAMES = new Array(
  'S', 'M', 'T', 'W', 'T', 'F', 'S', 'S'
);

Calendar.MONTH_NAMES = new Array(
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
);

Calendar.SHORT_MONTH_NAMES = new Array(
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov',
  'Dec' 
);

Calendar.NAV_PREVIOUS_YEAR  = -2;
Calendar.NAV_PREVIOUS_MONTH = -1;
Calendar.NAV_TODAY          =  0;
Calendar.NAV_NEXT_MONTH     =  1;
Calendar.NAV_NEXT_YEAR      =  2;

//------------------------------------------------------------------------------
// Static Methods
//------------------------------------------------------------------------------

// This gets called when the user presses a mouse button anywhere in the
// document, if the calendar is shown. If the click was outside the open
// calendar this function closes it.
Calendar._checkCalendar = function(event) {
  if (!window._popupCalendar)
    return false
  if (Element.descendantOf(Event.element(event), window._popupCalendar.container))
    return
  window._popupCalendar.callCloseHandler()
  return Event.stop(event)
}

//------------------------------------------------------------------------------
// Event Handlers
//------------------------------------------------------------------------------

Calendar.handleMouseDownEvent = function(event){
  if (event.element().type == 'select-one'){ // ignore select elements - not escaping this in Safari leaves select boxes non-functional
    return true
  } 
  Event.observe(document, 'mouseup', Calendar.handleMouseUpEvent)
  Event.stop(event)
}

// XXX I am not happy with how clicks of different actions are handled. Need to
// clean this up!
Calendar.handleMouseUpEvent = function(event){
  var el        = Event.element(event)
  var calendar  = el.calendar
  var isNewDate = false

  // If the element that was clicked on does not have an associated Calendar
  // object, return as we have nothing to do.
  if (!calendar) return false

  // Clicked on a day
  if (typeof el.navAction == 'undefined') {
    if (calendar.currentDateElement) {
      Element.removeClassName(calendar.currentDateElement, 'selected')
      Element.addClassName(el, 'selected')
      calendar.shouldClose = (calendar.currentDateElement == el)
      if (!calendar.shouldClose) calendar.currentDateElement = el
    }
    calendar.date.setDateOnly(el.date)
    isNewDate = true
    calendar.shouldClose = !el.hasClassName('otherDay')
    var isOtherMonth     = !calendar.shouldClose
    if (isOtherMonth) calendar.update(calendar.date)
  } else { // Clicked on an action button
    var date = new Date(calendar.date)

    if (el.navAction == Calendar.NAV_TODAY)
      date.setDateOnly(new Date())

    var year = date.getFullYear()
    var mon = date.getMonth()
    function setMonth(m) {
      var day = date.getDate()
      var max = date.getMonthDays(m)
      if (day > max) date.setDate(max)
      date.setMonth(m)
    }
    switch (el.navAction) {

      // Previous Year
      case Calendar.NAV_PREVIOUS_YEAR:
        if (year > calendar.minYear)
          date.__setFullYear(year - 1)
        break

      // Previous Month
      case Calendar.NAV_PREVIOUS_MONTH:
        if (mon > 0) {
          setMonth(mon - 1)
        }
        else if (year-- > calendar.minYear) {
          date.__setFullYear(year)
          setMonth(11)
        }
        break

      // Today
      case Calendar.NAV_TODAY:
        break

      // Next Month
      case Calendar.NAV_NEXT_MONTH:
        if (mon < 11) {
          setMonth(mon + 1)
        }else if (year < calendar.maxYear) {
          date.__setFullYear(year + 1)
          setMonth(0)
        }
        break

      // Next Year
      case Calendar.NAV_NEXT_YEAR:
        if (year < calendar.maxYear)
          date.__setFullYear(year + 1)
        break
    }

    if (!date.equalsTo(calendar.date)) {
      calendar.updateIfDateDifferent(date)
      isNewDate = true
    } else if (el.navAction == 0) {
      isNewDate = (calendar.shouldClose = true)
    }
  }

  if (isNewDate) event && calendar.callSelectHandler()
  if (calendar.shouldClose) event && calendar.callCloseHandler()

  Event.stopObserving(document, 'mouseup', Calendar.handleMouseUpEvent)

  return Event.stop(event)
}

Calendar.defaultSelectHandler = function(calendar){
  if (!calendar.dateField) return false

  // Update dateField value
  calendar.updateOuterField()

  // Trigger the onchange callback on the dateField, if one has been defined
  if (typeof calendar.dateField.onchange == 'function')
    calendar.dateField.onchange()

  // Call the close handler, if necessary
  if (calendar.shouldClose) calendar.callCloseHandler()
}

Calendar.defaultCloseHandler = function(calendar){
  calendar.hide();
  calendar.shouldClose = false;
}



//------------------------------------------------------------------------------
// Calendar Instance
//------------------------------------------------------------------------------

// global object that remembers the calendar
window._popupCalendar = null





























//==============================================================================
//
// Date Object Patches
//
// This is pretty much untouched from the original. I really would like to get
// rid of these patches if at all possible and find a cleaner way of
// accomplishing the same things. It's a shame Prototype doesn't extend Date at
// all.
//
//==============================================================================

Date.DAYS_IN_MONTH = new Array(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)
Date.SECOND        = 1000 /* milliseconds */
Date.MINUTE        = 60 * Date.SECOND
Date.HOUR          = 60 * Date.MINUTE
Date.DAY           = 24 * Date.HOUR
Date.WEEK          =  7 * Date.DAY

// Parses Date
Date.parseDate = function(str, fmt) {
  str = str.strip()
  
  var today = new Date();
  var y     = 0;
  var m     = -1;
  var d     = 0;
  var a     = str.split(/\W+/);
  var b     = fmt.match(/%./g);
  var i     = 0, j = 0;
  var hr    = 0;
  var min   = 0;

  for (i = 0; i < a.length; ++i) {
    if (!a[i]) continue;
    switch (b[i]) {
      case "%d":
      case "%e":
        d = parseInt(a[i], 10);
        break;
      case "%m":
        m = parseInt(a[i], 10) - 1;
        break;
      case "%Y":
      case "%y":
        y = parseInt(a[i], 10);
        (y < 100) && (y += (y > 29) ? 1900 : 2000);
        break;
      case "%b":
      case "%B":
        for (j = 0; j < 12; ++j) {
          if (Calendar.MONTH_NAMES[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) {
            m = j;
            break;
          }
        }
        break;
      case "%H":
      case "%I":
      case "%k":
      case "%l":
        hr = parseInt(a[i], 10);
        break;
      case "%P":
      case "%p":
        if (/pm/i.test(a[i]) && hr < 12)
          hr += 12;
        else if (/am/i.test(a[i]) && hr >= 12)
          hr -= 12;
        break;
      case "%M":
        min = parseInt(a[i], 10);
        break;
    }
  }
  if (isNaN(y)) y = today.getFullYear();
  if (isNaN(m)) m = today.getMonth();
  if (isNaN(d)) d = today.getDate();
  if (isNaN(hr)) hr = today.getHours();
  if (isNaN(min)) min = today.getMinutes();
  if (y != 0 && m != -1 && d != 0)
    return new Date(y, m, d, hr, min, 0);
  y = 0; m = -1; d = 0;
  for (i = 0; i < a.length; ++i) {
    if (a[i].search(/[a-zA-Z]+/) != -1) {
      var t = -1;
      for (j = 0; j < 12; ++j) {
        if (Calendar.MONTH_NAMES[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) { t = j; break; }
      }
      if (t != -1) {
        if (m != -1) {
          d = m+1;
        }
        m = t;
      }
    } else if (parseInt(a[i], 10) <= 12 && m == -1) {
      m = a[i]-1;
    } else if (parseInt(a[i], 10) > 31 && y == 0) {
      y = parseInt(a[i], 10);
      (y < 100) && (y += (y > 29) ? 1900 : 2000);
    } else if (d == 0) {
      d = a[i];
    }
  }
  if (y == 0)
    y = today.getFullYear();
  if (m != -1 && d != 0)
    return new Date(y, m, d, hr, min, 0);
  return today;
};

// Returns the number of days in the current month
Date.prototype.getMonthDays = function(month) {
  var year = this.getFullYear()
  if (typeof month == "undefined")
    month = this.getMonth()
  if (((0 == (year % 4)) && ( (0 != (year % 100)) || (0 == (year % 400)))) && month == 1)
    return 29
  else
    return Date.DAYS_IN_MONTH[month]
};

// Returns the number of day in the year
Date.prototype.getDayOfYear = function() {
  var now = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
  var then = new Date(this.getFullYear(), 0, 0, 0, 0, 0);
  var time = now - then;
  return Math.floor(time / Date.DAY);
};

/** Returns the number of the week in year, as defined in ISO 8601. */
Date.prototype.getWeekNumber = function() {
  var d = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
  var DoW = d.getDay();
  d.setDate(d.getDate() - (DoW + 6) % 7 + 3); // Nearest Thu
  var ms = d.valueOf(); // GMT
  d.setMonth(0);
  d.setDate(4); // Thu in Week 1
  return Math.round((ms - d.valueOf()) / (7 * 864e5)) + 1;
};

/** Checks date and time equality */
Date.prototype.equalsTo = function(date) {
  return ((this.getFullYear() == date.getFullYear()) &&
   (this.getMonth() == date.getMonth()) &&
   (this.getDate() == date.getDate()) &&
   (this.getHours() == date.getHours()) &&
   (this.getMinutes() == date.getMinutes()));
};

/** Set only the year, month, date parts (keep existing time) */
Date.prototype.setDateOnly = function(date) {
  var tmp = new Date(date);
  this.setDate(1);
  this.__setFullYear(tmp.getFullYear());
  this.setMonth(tmp.getMonth());
  this.setDate(tmp.getDate());
};

/** Prints the date in a string according to the given format. */
Date.prototype.print = function (str) {
  var m = this.getMonth();
  var d = this.getDate();
  var y = this.getFullYear();
  var wn = this.getWeekNumber();
  var w = this.getDay();
  var s = {};
  var hr = this.getHours();
  var pm = (hr >= 12);
  var ir = (pm) ? (hr - 12) : hr;
  var dy = this.getDayOfYear();
  if (ir == 0)
    ir = 12;
  var min = this.getMinutes();
  var sec = this.getSeconds();
  s["%a"] = Calendar.SHORT_DAY_NAMES[w]; // abbreviated weekday name [FIXME: I18N]
  s["%A"] = Calendar.DAY_NAMES[w]; // full weekday name
  s["%b"] = Calendar.SHORT_MONTH_NAMES[m]; // abbreviated month name [FIXME: I18N]
  s["%B"] = Calendar.MONTH_NAMES[m]; // full month name
  // FIXME: %c : preferred date and time representation for the current locale
  s["%C"] = 1 + Math.floor(y / 100); // the century number
  s["%d"] = (d < 10) ? ("0" + d) : d; // the day of the month (range 01 to 31)
  s["%e"] = d; // the day of the month (range 1 to 31)
  // FIXME: %D : american date style: %m/%d/%y
  // FIXME: %E, %F, %G, %g, %h (man strftime)
  s["%H"] = (hr < 10) ? ("0" + hr) : hr; // hour, range 00 to 23 (24h format)
  s["%I"] = (ir < 10) ? ("0" + ir) : ir; // hour, range 01 to 12 (12h format)
  s["%j"] = (dy < 100) ? ((dy < 10) ? ("00" + dy) : ("0" + dy)) : dy; // day of the year (range 001 to 366)
  s["%k"] = hr;   // hour, range 0 to 23 (24h format)
  s["%l"] = ir;   // hour, range 1 to 12 (12h format)
  s["%m"] = (m < 9) ? ("0" + (1+m)) : (1+m); // month, range 01 to 12
  s["%M"] = (min < 10) ? ("0" + min) : min; // minute, range 00 to 59
  s["%n"] = "\n";   // a newline character
  s["%p"] = pm ? "PM" : "AM";
  s["%P"] = pm ? "pm" : "am";
  // FIXME: %r : the time in am/pm notation %I:%M:%S %p
  // FIXME: %R : the time in 24-hour notation %H:%M
  s["%s"] = Math.floor(this.getTime() / 1000);
  s["%S"] = (sec < 10) ? ("0" + sec) : sec; // seconds, range 00 to 59
  s["%t"] = "\t";   // a tab character
  // FIXME: %T : the time in 24-hour notation (%H:%M:%S)
  s["%U"] = s["%W"] = s["%V"] = (wn < 10) ? ("0" + wn) : wn;
  s["%u"] = w + 1;  // the day of the week (range 1 to 7, 1 = MON)
  s["%w"] = w;    // the day of the week (range 0 to 6, 0 = SUN)
  // FIXME: %x : preferred date representation for the current locale without the time
  // FIXME: %X : preferred time representation for the current locale without the date
  s["%y"] = ('' + y).substr(2, 2); // year without the century (range 00 to 99)
  s["%Y"] = y;    // year with the century
  s["%%"] = "%";    // a literal '%' character

  return str.gsub(/%./, function(match) { return s[match] || match });
};


Date.prototype.__setFullYear = function(y) {
  var d = new Date(this);
  d.setFullYear(y);
  if (d.getMonth() != this.getMonth())
    this.setDate(28);
  this.setFullYear(y);
}
