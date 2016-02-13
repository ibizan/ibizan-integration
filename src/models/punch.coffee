
moment = require 'moment'
{ HEADERS, REGEX } = require '../helpers/constants'
MODES = ['in', 'out', 'vacation', 'unpaid', 'sick']
Organization = require('../models/organization').get()

class Punch
  constructor: (@mode = 'none', 
                @times = [], 
                @projects = [],
                @notes = '') ->
    # ...

  @parse: (user, command, mode='none') ->
    if not user or not command
      return
    if mode and mode isnt 'none'
      [mode, command] = parseMode command

    [start, end] = user.activeHours()
    [times, command] = parseTime command, start, end
    [dates, command] = parseDate command

    datetimes = []
    if times.length > 0 and dates.length > 0
      for date in dates
        for time in times
          datetime = moment(date)
          datetime.hour(time.hour())
          datetime.minute(time.minute())
          datetime.second(time.second())
          datetimes.push datetime
    else if times.length > 0
      datetimes = times
    else if dates.length > 0
      datetimes = dates

    if times.block?
      datetimes.block = times.block

    [projects, command] = parseProjects command
    notes = command

    punch = new Punch(mode, datetimes, projects, notes)
    punch

  toRawRow: (id, name) ->
    headers = HEADERS.rawdata
    row = {}
    row[headers.id] = id
    row[headers.today] = moment().format('MM/DD/YYYY')
    row[headers.name] = name
    if @times.block?
      block = @times.block
      hours = Math.floor block
      minutes = Math.round((block - hours) * 60)
      row[headers.blockTime] = "#{hours}:#{if minutes < 10 then "0#{minutes}" else minutes}:00"
    else
      row[headers[@mode]] = @times[0].format('hh:mm:ss A')
    row[headers.notes] = @notes
    max = if @projects.length < 6 then @projects.length else 5
    for i in [0..max]
      project = @projects[i]
      if project?
        row[headers["project#{i + 1}"]] = "##{project.name}"
    row

  assignRow: (row) ->
    @row = row

  isValid: (user) ->
    return true

  parseMode = (command) ->
    comps = command.split ' '
    [mode, command] = [comps.shift(), comps.join ' ']
    mode = (mode || '').trim()
    command = (command || '').trim()
    if mode in MODES
      [mode, command]
    else
      ['none', command]

  parseTime = (command, activeStart, activeEnd) ->
    # parse time component
    command = command || ''
    time = []
    if match = command.match REGEX.rel_time
      if match[0] is 'half-day' or match[0] is 'half day'
        copy = moment(activeStart)
        copy.hour(activeStart.hour() - 4)
        time.push copy, activeEnd
      else
        block = parseFloat match[3]
        time.block = block
      command = command.replace(match[0], '').trimLeft()
    else if match = command.match REGEX.time
      # TODO: DRY
      # do something with the absolutism
      today = moment()
      time.push moment("#{today.format('YYYY-MM-DD')} #{match[0]}")
      command = command.replace(match[0] + ' ', '')
    # else if match = command.match regex for time ranges (???)
    else
      time.push moment()
    [time, command]

  parseDate = (command) ->
    command = command || ''
    date = []
    if match = command.match /today/i
      date.push moment()
      command = command.replace(match[0] + ' ', '')
    else if match = command.match /yesterday/i
      yesterday = moment().subtract(1, 'days')
      date.push yesterday
      command = command.replace(match[0] + ' ', '')
    else if match = command.match REGEX.date # Placeholder for date blocks
      absDate = moment(match[0])
      absDate.setFullYear(moment.year())
      date.push absDate
      command = command.replace(match[0] + ' ', '')
    else
      date.push moment()
    [date, command]

  parseProjects = (command) ->
    projects = []
    command = command || ''
    command_copy = command.split(' ').slice()

    for word in command_copy
      if word.charAt(0) is '#'
        if project = Organization.getProjectByName word
          projects.push project
        command = command.replace word + ' ', ''
      else
        break
    [projects, command]

module.exports = Punch