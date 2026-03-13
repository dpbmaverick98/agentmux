#!/usr/bin/env bun
// @bun
import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      const helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) {
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        const removeShort = helpOption.short && cmd._findOption(helpOption.short);
        const removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) {
          visibleOptions.push(helpOption);
        } else if (helpOption.long && !removeLong) {
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        } else if (helpOption.short && !removeShort) {
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
        }
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, helper.subcommandTerm(command).length);
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, helper.argumentTerm(argument).length);
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        return `${option.description} (${extraInfo.join(", ")})`;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescripton = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescripton}`;
        }
        return extraDescripton;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth || 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;
      function formatItem(term, description) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
          return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
        }
        return term;
      }
      function formatList(textArray) {
        return textArray.join(`
`).replace(/^/gm, " ".repeat(itemIndentWidth));
      }
      let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([
          helper.wrap(commandDescription, helpWidth, 0),
          ""
        ]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
      });
      if (argumentList.length > 0) {
        output = output.concat(["Arguments:", formatList(argumentList), ""]);
      }
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return formatItem(helper.optionTerm(option), helper.optionDescription(option));
      });
      if (optionList.length > 0) {
        output = output.concat(["Options:", formatList(optionList), ""]);
      }
      if (this.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (globalOptionList.length > 0) {
          output = output.concat([
            "Global Options:",
            formatList(globalOptionList),
            ""
          ]);
        }
      }
      const commandList = helper.visibleCommands(cmd).map((cmd2) => {
        return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
      });
      if (commandList.length > 0) {
        output = output.concat(["Commands:", formatList(commandList), ""]);
      }
      return output.join(`
`);
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    wrap(str, width, indent, minColumnWidth = 40) {
      const indents = " \\f\\t\\v   -   　\uFEFF";
      const manualIndent = new RegExp(`[\\n][${indents}]+`);
      if (str.match(manualIndent))
        return str;
      const columnWidth = width - indent;
      if (columnWidth < minColumnWidth)
        return str;
      const leadingStr = str.slice(0, indent);
      const columnText = str.slice(indent).replace(`\r
`, `
`);
      const indentString = " ".repeat(indent);
      const zeroWidthSpace = "​";
      const breaks = `\\s${zeroWidthSpace}`;
      const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
      const lines = columnText.match(regex) || [];
      return leadingStr + lines.map((line, i) => {
        if (line === `
`)
          return "";
        return (i > 0 ? indentString : "") + line.trimEnd();
      }).join(`
`);
    }
  }
  exports.Help = Help;
});

// node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const flagParts = flags.split(/[ |,]+/);
    if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
      shortFlag = flagParts.shift();
    longFlag = flagParts.shift();
    if (!shortFlag && /^-[^-]$/.test(longFlag)) {
      shortFlag = longFlag;
      longFlag = undefined;
    }
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.DualOptions = DualOptions;
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("node:events").EventEmitter;
  var childProcess = __require("node:child_process");
  var path = __require("node:path");
  var fs = __require("node:fs");
  var process2 = __require("node:process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = true;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        outputError: (str, write) => write(str)
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof fn === "function") {
        argument.default(defaultValue).argParser(fn);
      } else {
        argument.default(fn);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        return this;
      }
      enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
      const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
      const helpDescription = description ?? "display help for command";
      const helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs)
        helpCommand.arguments(helpArgs);
      if (helpDescription)
        helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    _getHelpCommand() {
      const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
      if (hasImplicitHelpCommand) {
        if (this._helpCommand === undefined) {
          this.helpCommand(undefined, undefined);
        }
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    _registerOption(option) {
      const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
      if (matchingOption) {
        const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this.options.push(option);
    }
    _registerCommand(command) {
      const knownBy = (cmd) => {
        return [cmd.name()].concat(cmd.aliases());
      };
      const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        const newCmd = knownBy(command).join("|");
        throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._concatValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
        throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
      }
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      if (Object.keys(this._optionValues).length) {
        throw new Error("call .storeOptionsAsProperties() before setting option values");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (process2.versions?.electron) {
          parseOptions.from = "electron";
        }
        const execArgv = process2.execArgv ?? [];
        if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
          parseOptions.from = "eval";
        }
      }
      if (argv === undefined) {
        argv = process2.argv;
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch (err) {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) {
          process2.exit(code);
        } else {
          exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
        }
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
          const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
          throw new Error(executableMissing);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      const args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        const arg = args.shift();
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args.shift();
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) {
                value = args.shift();
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg);
            if (args.length > 0)
              operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0)
            dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      const matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      if (helper.helpWidth === undefined) {
        helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
      }
      return helper.formatHelp(this, helper);
    }
    _getHelpContext(contextOptions) {
      contextOptions = contextOptions || {};
      const context = { error: !!contextOptions.error };
      let write;
      if (context.error) {
        write = (arg) => this._outputConfiguration.writeErr(arg);
      } else {
        write = (arg) => this._outputConfiguration.writeOut(arg);
      }
      context.write = contextOptions.write || write;
      context.command = this;
      return context;
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const context = this._getHelpContext(contextOptions);
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
      this.emit("beforeHelp", context);
      let helpInformation = this.helpInformation(context);
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      context.write(helpInformation);
      if (this._getHelpOption()?.long) {
        this.emit(this._getHelpOption().long);
      }
      this.emit("afterHelp", context);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) {
          this._helpOption = this._helpOption ?? undefined;
        } else {
          this._helpOption = null;
        }
        return this;
      }
      flags = flags ?? "-h, --help";
      description = description ?? "display help for command";
      this._helpOption = this.createOption(flags, description);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) {
        this.helpOption(undefined, undefined);
      }
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = process2.exitCode || 0;
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      const helpOption = this._getHelpOption();
      const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
      if (helpRequested) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  exports.Command = Command;
});

// node_modules/commander/index.js
var require_commander = __commonJS((exports) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports.program = new Command;
  exports.createCommand = (name) => new Command(name);
  exports.createOption = (flags, description) => new Option(flags, description);
  exports.createArgument = (name, description) => new Argument(name, description);
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// node_modules/chalk/source/vendor/ansi-styles/index.js
function assembleStyles() {
  const codes = new Map;
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ANSI_BACKGROUND_OFFSET = 10, wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`, wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`, wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`, styles, modifierNames, foregroundColorNames, backgroundColorNames, colorNames, ansiStyles, ansi_styles_default;
var init_ansi_styles = __esm(() => {
  styles = {
    modifier: {
      reset: [0, 0],
      bold: [1, 22],
      dim: [2, 22],
      italic: [3, 23],
      underline: [4, 24],
      overline: [53, 55],
      inverse: [7, 27],
      hidden: [8, 28],
      strikethrough: [9, 29]
    },
    color: {
      black: [30, 39],
      red: [31, 39],
      green: [32, 39],
      yellow: [33, 39],
      blue: [34, 39],
      magenta: [35, 39],
      cyan: [36, 39],
      white: [37, 39],
      blackBright: [90, 39],
      gray: [90, 39],
      grey: [90, 39],
      redBright: [91, 39],
      greenBright: [92, 39],
      yellowBright: [93, 39],
      blueBright: [94, 39],
      magentaBright: [95, 39],
      cyanBright: [96, 39],
      whiteBright: [97, 39]
    },
    bgColor: {
      bgBlack: [40, 49],
      bgRed: [41, 49],
      bgGreen: [42, 49],
      bgYellow: [43, 49],
      bgBlue: [44, 49],
      bgMagenta: [45, 49],
      bgCyan: [46, 49],
      bgWhite: [47, 49],
      bgBlackBright: [100, 49],
      bgGray: [100, 49],
      bgGrey: [100, 49],
      bgRedBright: [101, 49],
      bgGreenBright: [102, 49],
      bgYellowBright: [103, 49],
      bgBlueBright: [104, 49],
      bgMagentaBright: [105, 49],
      bgCyanBright: [106, 49],
      bgWhiteBright: [107, 49]
    }
  };
  modifierNames = Object.keys(styles.modifier);
  foregroundColorNames = Object.keys(styles.color);
  backgroundColorNames = Object.keys(styles.bgColor);
  colorNames = [...foregroundColorNames, ...backgroundColorNames];
  ansiStyles = assembleStyles();
  ansi_styles_default = ansiStyles;
});

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== undefined) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === undefined) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => (key in env))) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => (sign in env)) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var env, flagForceColor, supportsColor, supports_color_default;
var init_supports_color = __esm(() => {
  ({ env } = process2);
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
    flagForceColor = 0;
  } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
    flagForceColor = 1;
  }
  supportsColor = {
    stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
    stderr: createSupportsColor({ isTTY: tty.isatty(2) })
  };
  supports_color_default = supportsColor;
});

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? `\r
` : `
`) + postfix;
    endIndex = index + 1;
    index = string.indexOf(`
`, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}

// src/lib/paths.ts
import { existsSync as existsSync2 } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
function findAgentMuxDir2(startDir = process.cwd()) {
  let currentDir = startDir;
  const root = "/";
  while (currentDir !== root) {
    const candidate = join2(currentDir, ".agentmux");
    if (existsSync2(candidate)) {
      return candidate;
    }
    currentDir = dirname2(currentDir);
  }
  return null;
}
function getAgentMuxDir2() {
  if (cachedAgentMuxDir2) {
    return cachedAgentMuxDir2;
  }
  const found = findAgentMuxDir2();
  if (found) {
    cachedAgentMuxDir2 = found;
    return found;
  }
  const cwd = process.cwd();
  const defaultDir = join2(cwd, ".agentmux");
  cachedAgentMuxDir2 = defaultDir;
  return defaultDir;
}
var cachedAgentMuxDir2 = null;
var init_paths = () => {};

// src/memory/storage/config.ts
var exports_config = {};
__export(exports_config, {
  writeConfig: () => writeConfig,
  readConfig: () => readConfig,
  getMulchDir: () => getMulchDir,
  getExpertisePath: () => getExpertisePath,
  getExpertiseDir: () => getExpertiseDir,
  ensureExpertiseDir: () => ensureExpertiseDir,
  addDomain: () => addDomain
});
import { existsSync as existsSync3 } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join as join3 } from "node:path";
function getExpertiseDir() {
  return EXPERTISE_DIR;
}
function getExpertisePath(domain) {
  return join3(EXPERTISE_DIR, `${domain}.jsonl`);
}
function getMulchDir() {
  return AGENTMUX_DIR;
}
async function ensureExpertiseDir() {
  const { mkdir } = await import("node:fs/promises");
  if (!existsSync3(EXPERTISE_DIR)) {
    const agentMuxDir = getAgentMuxDir2();
    if (!existsSync3(agentMuxDir)) {
      await mkdir(agentMuxDir, { recursive: true });
    }
    await mkdir(EXPERTISE_DIR, { recursive: true });
  }
}
async function readConfig() {
  await ensureExpertiseDir();
  try {
    const content = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return DEFAULT_CONFIG;
  }
}
async function writeConfig(config) {
  await ensureExpertiseDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
async function addDomain(domain) {
  const config = await readConfig();
  if (!config.domains.includes(domain)) {
    config.domains.push(domain);
    await writeConfig(config);
  }
  const { mkdir } = await import("node:fs/promises");
  const filePath = getExpertisePath(domain);
  if (!existsSync3(filePath)) {
    await createExpertiseFile(filePath);
  }
}
var AGENTMUX_DIR, EXPERTISE_DIR, CONFIG_PATH, DEFAULT_CONFIG;
var init_config = __esm(() => {
  init_paths();
  init_store();
  AGENTMUX_DIR = getAgentMuxDir2();
  EXPERTISE_DIR = join3(AGENTMUX_DIR, "expertise");
  CONFIG_PATH = join3(AGENTMUX_DIR, "config.json");
  DEFAULT_CONFIG = {
    domains: ["project", "tasks", "decisions"],
    governance: {
      max_entries: 100,
      classification_defaults: {
        shelf_life: {
          tactical: 14,
          observational: 30
        }
      }
    }
  };
});

// src/memory/storage/store.ts
import { createHash } from "node:crypto";
import {
  appendFile,
  readFile as readFile2,
  rename,
  stat,
  unlink,
  writeFile as writeFile2
} from "node:fs/promises";
async function findAndUpdateMemoryPlanRef(memoryRef, planRef) {
  const { readConfig: readConfig2 } = await Promise.resolve().then(() => (init_config(), exports_config));
  const config = await readConfig2();
  for (const domain of config.domains) {
    const filePath = getExpertisePath(domain);
    const records = await readExpertiseFile(filePath);
    const record = findRecordById(records, memoryRef);
    if (record) {
      if (!record.plan_refs) {
        record.plan_refs = [];
      }
      if (!record.plan_refs.includes(planRef)) {
        record.plan_refs.push(planRef);
        await writeExpertiseFile(filePath, records);
      }
      return true;
    }
  }
  return false;
}
async function readExpertiseFile(filePath) {
  let content;
  try {
    content = await readFile2(filePath, ENCODING);
  } catch {
    return [];
  }
  const records = [];
  const lines = content.split(`
`).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {}
  }
  return records;
}
function generateRecordId(record) {
  let key;
  switch (record.type) {
    case "convention":
      key = `convention:${record.content}`;
      break;
    case "failure":
      key = `failure:${record.description}`;
      break;
    case "decision":
      key = `decision:${record.title}`;
      break;
  }
  return `am-${createHash("sha256").update(key).digest("hex").slice(0, 6)}`;
}
async function createExpertiseFile(filePath) {
  await writeFile2(filePath, "", ENCODING);
}
async function writeExpertiseFile(filePath, records) {
  for (const r of records) {
    if (!r.id) {
      r.id = generateRecordId(r);
    }
  }
  const content = records.map((r) => JSON.stringify(r)).join(`
`) + (records.length > 0 ? `
` : "");
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await writeFile2(tmpPath, content, ENCODING);
  try {
    await rename(tmpPath, filePath);
  } catch (err) {
    try {
      await unlink(tmpPath);
    } catch {}
    throw err;
  }
}
function findRecordById(records, id) {
  return records.find((r) => r.id === id) || null;
}
var ENCODING = "utf-8";
var init_store = __esm(() => {
  init_config();
});

// src/memory/storage/config.ts
var exports_config2 = {};
__export(exports_config2, {
  writeConfig: () => writeConfig2,
  readConfig: () => readConfig2,
  getMulchDir: () => getMulchDir2,
  getExpertisePath: () => getExpertisePath2,
  getExpertiseDir: () => getExpertiseDir2,
  ensureExpertiseDir: () => ensureExpertiseDir2,
  addDomain: () => addDomain2
});
import { existsSync as existsSync4 } from "node:fs";
import { readFile as readFile3, writeFile as writeFile3 } from "node:fs/promises";
import { join as join4 } from "node:path";
function getExpertiseDir2() {
  return EXPERTISE_DIR2;
}
function getExpertisePath2(domain) {
  return join4(EXPERTISE_DIR2, `${domain}.jsonl`);
}
function getMulchDir2() {
  return AGENTMUX_DIR2;
}
async function ensureExpertiseDir2() {
  const { mkdir } = await import("node:fs/promises");
  if (!existsSync4(EXPERTISE_DIR2)) {
    const agentMuxDir = getAgentMuxDir2();
    if (!existsSync4(agentMuxDir)) {
      await mkdir(agentMuxDir, { recursive: true });
    }
    await mkdir(EXPERTISE_DIR2, { recursive: true });
  }
}
async function readConfig2() {
  await ensureExpertiseDir2();
  try {
    const content = await readFile3(CONFIG_PATH2, "utf-8");
    return JSON.parse(content);
  } catch {
    return DEFAULT_CONFIG2;
  }
}
async function writeConfig2(config) {
  await ensureExpertiseDir2();
  await writeFile3(CONFIG_PATH2, JSON.stringify(config, null, 2), "utf-8");
}
async function addDomain2(domain) {
  const config = await readConfig2();
  if (!config.domains.includes(domain)) {
    config.domains.push(domain);
    await writeConfig2(config);
  }
  const { mkdir } = await import("node:fs/promises");
  const filePath = getExpertisePath2(domain);
  if (!existsSync4(filePath)) {
    await createExpertiseFile(filePath);
  }
}
var AGENTMUX_DIR2, EXPERTISE_DIR2, CONFIG_PATH2, DEFAULT_CONFIG2;
var init_config2 = __esm(() => {
  init_paths();
  init_store();
  AGENTMUX_DIR2 = getAgentMuxDir2();
  EXPERTISE_DIR2 = join4(AGENTMUX_DIR2, "expertise");
  CONFIG_PATH2 = join4(AGENTMUX_DIR2, "config.json");
  DEFAULT_CONFIG2 = {
    domains: ["project", "tasks", "decisions"],
    governance: {
      max_entries: 100,
      classification_defaults: {
        shelf_life: {
          tactical: 14,
          observational: 30
        }
      }
    }
  };
});

// src/memory/storage/store.ts
var exports_store = {};
__export(exports_store, {
  writeExpertiseFile: () => writeExpertiseFile2,
  readExpertiseFile: () => readExpertiseFile2,
  getFileModTime: () => getFileModTime,
  generateRecordId: () => generateRecordId2,
  findRecordById: () => findRecordById2,
  findDuplicate: () => findDuplicate,
  findAndUpdateMemoryPlanRef: () => findAndUpdateMemoryPlanRef2,
  filterByType: () => filterByType,
  filterByClassification: () => filterByClassification,
  createExpertiseFile: () => createExpertiseFile2,
  appendRecord: () => appendRecord
});
import { createHash as createHash2 } from "node:crypto";
import {
  appendFile as appendFile2,
  readFile as readFile4,
  rename as rename2,
  stat as stat2,
  unlink as unlink2,
  writeFile as writeFile4
} from "node:fs/promises";
async function findAndUpdateMemoryPlanRef2(memoryRef, planRef) {
  const { readConfig: readConfig3 } = await Promise.resolve().then(() => (init_config(), exports_config));
  const config = await readConfig3();
  for (const domain of config.domains) {
    const filePath = getExpertisePath(domain);
    const records = await readExpertiseFile2(filePath);
    const record = findRecordById2(records, memoryRef);
    if (record) {
      if (!record.plan_refs) {
        record.plan_refs = [];
      }
      if (!record.plan_refs.includes(planRef)) {
        record.plan_refs.push(planRef);
        await writeExpertiseFile2(filePath, records);
      }
      return true;
    }
  }
  return false;
}
async function readExpertiseFile2(filePath) {
  let content;
  try {
    content = await readFile4(filePath, ENCODING2);
  } catch {
    return [];
  }
  const records = [];
  const lines = content.split(`
`).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch {}
  }
  return records;
}
function generateRecordId2(record) {
  let key;
  switch (record.type) {
    case "convention":
      key = `convention:${record.content}`;
      break;
    case "failure":
      key = `failure:${record.description}`;
      break;
    case "decision":
      key = `decision:${record.title}`;
      break;
  }
  return `am-${createHash2("sha256").update(key).digest("hex").slice(0, 6)}`;
}
async function appendRecord(filePath, record) {
  if (!record.id) {
    record.id = generateRecordId2(record);
  }
  const line = `${JSON.stringify(record)}
`;
  await appendFile2(filePath, line, ENCODING2);
}
async function createExpertiseFile2(filePath) {
  await writeFile4(filePath, "", ENCODING2);
}
async function getFileModTime(filePath) {
  try {
    const stats = await stat2(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}
async function writeExpertiseFile2(filePath, records) {
  for (const r of records) {
    if (!r.id) {
      r.id = generateRecordId2(r);
    }
  }
  const content = records.map((r) => JSON.stringify(r)).join(`
`) + (records.length > 0 ? `
` : "");
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await writeFile4(tmpPath, content, ENCODING2);
  try {
    await rename2(tmpPath, filePath);
  } catch (err) {
    try {
      await unlink2(tmpPath);
    } catch {}
    throw err;
  }
}
function filterByType(records, type) {
  return records.filter((r) => r.type === type);
}
function filterByClassification(records, classification) {
  return records.filter((r) => r.classification === classification);
}
function findDuplicate(existing, newRecord) {
  for (let i = 0;i < existing.length; i++) {
    const record = existing[i];
    if (record.type !== newRecord.type)
      continue;
    switch (record.type) {
      case "convention":
        if (newRecord.type === "convention" && record.content === newRecord.content) {
          return { index: i, record };
        }
        break;
      case "failure":
        if (newRecord.type === "failure" && record.description === newRecord.description) {
          return { index: i, record };
        }
        break;
      case "decision":
        if (newRecord.type === "decision" && record.title === newRecord.title) {
          return { index: i, record };
        }
        break;
    }
  }
  return null;
}
function findRecordById2(records, id) {
  return records.find((r) => r.id === id) || null;
}
var ENCODING2 = "utf-8";
var init_store2 = __esm(() => {
  init_config();
});

// src/lib/format.ts
function formatRecord2(record, style = "compact") {
  switch (style) {
    case "compact":
      return formatCompact2(record);
    case "full":
      return formatFull2(record);
    case "injection":
      return formatForInjection2(record);
    default:
      return formatCompact2(record);
  }
}
function formatCompact2(record) {
  switch (record.type) {
    case "convention":
      return `- ${record.content}`;
    case "failure":
      return `- ${record.description}
  → ${record.resolution}`;
    case "decision":
      return `- **${record.title}**: ${record.rationale}`;
  }
}
function formatFull2(record) {
  const base = `[${record.type}] ${record.classification}`;
  switch (record.type) {
    case "convention":
      return `${base}: ${record.content}`;
    case "failure":
      return `${base}: ${record.description} → ${record.resolution}`;
    case "decision":
      return `${base}: ${record.title}: ${record.rationale}`;
  }
}
function formatForInjection2(record) {
  switch (record.type) {
    case "convention":
      return `[context] ${record.content}`;
    case "failure":
      return `[context] ${record.description} → ${record.resolution}`;
    case "decision":
      return `[context] ${record.title}: ${record.rationale}`;
  }
}
function getRecordText(record) {
  switch (record.type) {
    case "convention":
      return record.content;
    case "failure":
      return `${record.description} ${record.resolution}`;
    case "decision":
      return `${record.title} ${record.rationale}`;
  }
}

// src/context/matcher.ts
var exports_matcher = {};
__export(exports_matcher, {
  matchMemories: () => matchMemories,
  formatMemoryForInjection: () => formatMemoryForInjection,
  extractKeywords: () => extractKeywords,
  calculateRelevance: () => calculateRelevance
});
function extractKeywords(text) {
  const tokens = text.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((t) => t.length > 2);
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "have",
    "has",
    "will",
    "would",
    "could",
    "should",
    "what",
    "when",
    "where",
    "which",
    "there",
    "were",
    "been",
    "being",
    "some",
    "them",
    "they",
    "these",
    "those",
    "about",
    "into",
    "more",
    "such",
    "into",
    "after",
    "before"
  ]);
  return [...new Set(tokens.filter((t) => !stopWords.has(t)))];
}
function calculateRelevance(record, keywords) {
  let score = 0;
  const recordText = getRecordText(record).toLowerCase();
  const recordKeywords = extractKeywords(recordText);
  for (const kw of keywords) {
    if (recordKeywords.includes(kw)) {
      score += 1;
    }
  }
  if (record.classification === "foundational") {
    score *= 1.5;
  }
  return score;
}
function matchMemories(records, message, maxResults = 2, minScore = 1) {
  const keywords = extractKeywords(message);
  if (keywords.length === 0) {
    return [];
  }
  const scored = records.map((record) => ({
    record,
    score: calculateRelevance(record, keywords)
  })).filter((s) => s.score >= minScore).sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults).map((s) => s.record);
}
function formatMemoryForInjection(record) {
  return formatRecord2(record, "injection");
}
var init_matcher = () => {};

// node_modules/chalk/source/index.js
function createChalk2(options) {
  return chalkFactory2(options);
}
var stdoutColor2, stderrColor2, GENERATOR2, STYLER2, IS_EMPTY2, levelMapping2, styles3, applyOptions2 = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor2 ? stdoutColor2.level : 0;
  object.level = options.level === undefined ? colorLevel : options.level;
}, chalkFactory2 = (options) => {
  const chalk2 = (...strings) => strings.join(" ");
  applyOptions2(chalk2, options);
  Object.setPrototypeOf(chalk2, createChalk2.prototype);
  return chalk2;
}, getModelAnsi2 = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi2("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
}, usedModels2, proto2, createStyler2 = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
}, createBuilder2 = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle2(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto2);
  builder[GENERATOR2] = self;
  builder[STYLER2] = _styler;
  builder[IS_EMPTY2] = _isEmpty;
  return builder;
}, applyStyle2 = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY2] ? "" : string;
  }
  let styler = self[STYLER2];
  if (styler === undefined) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
}, chalk2, chalkStderr2, source_default2;
var init_source = __esm(() => {
  init_ansi_styles();
  init_supports_color();
  ({ stdout: stdoutColor2, stderr: stderrColor2 } = supports_color_default);
  GENERATOR2 = Symbol("GENERATOR");
  STYLER2 = Symbol("STYLER");
  IS_EMPTY2 = Symbol("IS_EMPTY");
  levelMapping2 = [
    "ansi",
    "ansi",
    "ansi256",
    "ansi16m"
  ];
  styles3 = Object.create(null);
  Object.setPrototypeOf(createChalk2.prototype, Function.prototype);
  for (const [styleName, style] of Object.entries(ansi_styles_default)) {
    styles3[styleName] = {
      get() {
        const builder = createBuilder2(this, createStyler2(style.open, style.close, this[STYLER2]), this[IS_EMPTY2]);
        Object.defineProperty(this, styleName, { value: builder });
        return builder;
      }
    };
  }
  styles3.visible = {
    get() {
      const builder = createBuilder2(this, this[STYLER2], true);
      Object.defineProperty(this, "visible", { value: builder });
      return builder;
    }
  };
  usedModels2 = ["rgb", "hex", "ansi256"];
  for (const model of usedModels2) {
    styles3[model] = {
      get() {
        const { level } = this;
        return function(...arguments_) {
          const styler = createStyler2(getModelAnsi2(model, levelMapping2[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER2]);
          return createBuilder2(this, styler, this[IS_EMPTY2]);
        };
      }
    };
    const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
    styles3[bgModel] = {
      get() {
        const { level } = this;
        return function(...arguments_) {
          const styler = createStyler2(getModelAnsi2(model, levelMapping2[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER2]);
          return createBuilder2(this, styler, this[IS_EMPTY2]);
        };
      }
    };
  }
  proto2 = Object.defineProperties(() => {}, {
    ...styles3,
    level: {
      enumerable: true,
      get() {
        return this[GENERATOR2].level;
      },
      set(level) {
        this[GENERATOR2].level = level;
      }
    }
  });
  Object.defineProperties(createChalk2.prototype, styles3);
  chalk2 = createChalk2();
  chalkStderr2 = createChalk2({ level: stderrColor2 ? stderrColor2.level : 0 });
  source_default2 = chalk2;
});

// src/plan/storage/config.ts
import { existsSync as existsSync5, mkdirSync } from "node:fs";
import { join as join5 } from "node:path";
function getPlansDir() {
  return PLANS_DIR;
}
function getPlanDir(name) {
  return join5(PLANS_DIR, name);
}
function getManifestPath(planName) {
  return join5(PLANS_DIR, planName, "manifest.jsonl");
}
function getVersionPath(planName, version, hash) {
  return join5(PLANS_DIR, planName, `v${version}-${hash}.md`);
}
function getCurrentSymlinkPath(planName) {
  return join5(PLANS_DIR, planName, "current.md");
}
function ensurePlansDir() {
  if (!existsSync5(PLANS_DIR)) {
    mkdirSync(PLANS_DIR, { recursive: true });
  }
}
function ensurePlanDir(name) {
  const planDir = getPlanDir(name);
  if (!existsSync5(planDir)) {
    mkdirSync(planDir, { recursive: true });
  }
}
function getAgentName() {
  return process.env.AGENTMUX_AGENT || "unknown";
}
var AGENTMUX_DIR3, PLANS_DIR;
var init_config3 = __esm(() => {
  init_paths();
  AGENTMUX_DIR3 = getAgentMuxDir2();
  PLANS_DIR = join5(AGENTMUX_DIR3, "plans");
});

// src/plan/storage/util.ts
import { renameSync, unlinkSync, writeFileSync } from "node:fs";
function atomicWrite(path, content) {
  const tmpPath = `${path}.tmp.${Date.now()}`;
  writeFileSync(tmpPath, content, "utf-8");
  try {
    renameSync(tmpPath, path);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {}
    throw err;
  }
}
var init_util = () => {};

// src/plan/storage/registry.ts
import { existsSync as existsSync6, readFileSync, writeFileSync as writeFileSync2 } from "node:fs";
function getIndexPath() {
  return `${getPlansDir()}/index.jsonl`;
}
function ensureIndex() {
  ensurePlansDir();
  const indexPath = getIndexPath();
  if (!existsSync6(indexPath)) {
    writeFileSync2(indexPath, "", "utf-8");
  }
}
function readIndex() {
  ensureIndex();
  const indexPath = getIndexPath();
  const content = readFileSync(indexPath, "utf-8");
  if (!content.trim())
    return [];
  const entries = [];
  const lines = content.trim().split(`
`);
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {}
  }
  return entries;
}
function writeIndex(entries) {
  const indexPath = getIndexPath();
  const content = entries.map((e) => JSON.stringify(e)).join(`
`) + `
`;
  atomicWrite(indexPath, content);
}
function listPlans() {
  return readIndex();
}
function getPlan(name) {
  const entries = readIndex();
  const exact = entries.find((e) => e.name === name);
  if (exact)
    return exact;
  const parts = name.split("/");
  const shortName = parts[parts.length - 1];
  return entries.find((e) => {
    const eParts = e.name.split("/");
    const eShortName = eParts[eParts.length - 1];
    return eShortName === shortName || e.name.endsWith(name);
  });
}
function planExists(name) {
  return getPlan(name) !== undefined;
}
function createPlan(name) {
  const entries = readIndex();
  const existing = entries.find((e) => e.name === name);
  if (existing) {
    throw new Error(`Plan '${name}' already exists`);
  }
  const agentName = getAgentName();
  const fullName = name.startsWith("@") ? name : `@${agentName}/${name}`;
  const entry = {
    name: fullName,
    creator: agentName,
    created_at: new Date().toISOString(),
    path: `plans/${fullName}`
  };
  entries.push(entry);
  writeIndex(entries);
  return entry;
}
var init_registry = __esm(() => {
  init_config3();
  init_util();
});

// src/plan/commands/init.ts
var exports_init = {};
__export(exports_init, {
  listPlanCommand: () => listPlanCommand,
  initPlan: () => initPlan
});
async function initPlan(name) {
  ensurePlansDir();
  if (planExists(name)) {
    console.log(source_default2.yellow(`Plan '${name}' already exists`));
    return;
  }
  const entry = createPlan(name);
  ensurePlanDir(entry.name);
  console.log(source_default2.green(`✓ Created plan '${entry.name}'`));
  console.log(source_default2.gray(`  Creator: ${entry.creator}`));
  console.log(source_default2.gray(`  Created: ${new Date(entry.created_at).toLocaleString()}`));
  console.log(source_default2.gray(`  Path: ${entry.path}/`));
  console.log();
  console.log(source_default2.cyan("Next steps:"));
  console.log(source_default2.gray(`  1. Create your initial plan content`));
  console.log(source_default2.gray(`  2. Run: am plan commit ${name} -m "Initial plan"`));
}
async function listPlanCommand() {
  const plans = listPlans();
  if (plans.length === 0) {
    console.log(source_default2.yellow("No plans found. Create one with: am plan init <name>"));
    return;
  }
  console.log(source_default2.bold(`
Plans:
`));
  plans.forEach((plan) => {
    console.log(source_default2.cyan(`  ${plan.name}`));
    console.log(source_default2.gray(`    creator: ${plan.creator}`));
    console.log(source_default2.gray(`    created: ${new Date(plan.created_at).toLocaleString()}`));
    console.log();
  });
}
var init_init = __esm(() => {
  init_source();
  init_registry();
  init_config3();
});

// src/plan/storage/manifest.ts
import { existsSync as existsSync7, readFileSync as readFileSync2, symlinkSync, unlinkSync as unlinkSync2 } from "node:fs";
import { createHash as createHash3 } from "node:crypto";
function readManifest(planName) {
  const manifestPath = getManifestPath(planName);
  if (!existsSync7(manifestPath))
    return [];
  const content = readFileSync2(manifestPath, "utf-8");
  if (!content.trim())
    return [];
  const entries = [];
  const lines = content.trim().split(`
`);
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {}
  }
  return entries;
}
function writeManifest(planName, entries) {
  ensurePlanDir(planName);
  const manifestPath = getManifestPath(planName);
  const content = entries.map((e) => JSON.stringify(e)).join(`
`) + `
`;
  atomicWrite(manifestPath, content);
}
function getVersionHistory(planName) {
  return readManifest(planName);
}
function getLatestVersion(planName) {
  const history = readManifest(planName);
  if (history.length === 0)
    return null;
  return history[history.length - 1];
}
function getVersion(planName, version) {
  const history = readManifest(planName);
  return history.find((e) => e.version === version) || null;
}
function addVersion(planName, message, content) {
  const history = readManifest(planName);
  const latest = history.length > 0 ? history[history.length - 1] : null;
  const versionNum = history.length + 1;
  const hash = generateHash(content);
  const entry = {
    version: `${versionNum}`,
    hash,
    parent: latest ? latest.version : null,
    message,
    created_at: new Date().toISOString(),
    created_by: getAgentName(),
    memory_refs: []
  };
  history.push(entry);
  writeManifest(planName, history);
  return entry;
}
function generateHash(content) {
  return createHash3("sha256").update(content).digest("hex").slice(0, 8);
}
function addMemoryRef(planName, version, memoryRef) {
  const history = readManifest(planName);
  const entry = history.find((e) => e.version === version);
  if (!entry) {
    throw new Error(`Version ${version} not found in plan ${planName}`);
  }
  if (!entry.memory_refs.includes(memoryRef)) {
    entry.memory_refs.push(memoryRef);
    writeManifest(planName, history);
  }
}
function updateCurrentSymlink(planName, version, hash) {
  const planDir = getPlanDir(planName);
  const versionFile = `v${version}-${hash}.md`;
  const symlinkPath = getCurrentSymlinkPath(planName);
  if (existsSync7(symlinkPath)) {
    unlinkSync2(symlinkPath);
  }
  symlinkSync(versionFile, symlinkPath);
}
var init_manifest = __esm(() => {
  init_config3();
  init_util();
});

// src/plan/commands/commit.ts
var exports_commit = {};
__export(exports_commit, {
  showPlan: () => showPlan,
  logPlan: () => logPlan,
  commitPlan: () => commitPlan
});
import { existsSync as existsSync8, readFileSync as readFileSync3, writeFileSync as writeFileSync3 } from "node:fs";
async function commitPlan(name, message) {
  const plan = getPlan(name);
  if (!plan) {
    console.log(source_default2.red(`Plan '${name}' not found`));
    console.log(source_default2.gray("Create it with: am plan init <name>"));
    return;
  }
  const planDir = getPlanDir(plan.name);
  const draftPath = `${planDir}/draft.md`;
  const rootPlanPath = `${process.cwd()}/plan.md`;
  let content;
  let sourcePath;
  if (existsSync8(draftPath)) {
    sourcePath = draftPath;
    content = readFileSync3(draftPath, "utf-8");
  } else if (existsSync8(rootPlanPath)) {
    sourcePath = rootPlanPath;
    content = readFileSync3(rootPlanPath, "utf-8");
  } else {
    console.log(source_default2.red("No plan content found"));
    console.log(source_default2.gray("Create draft.md in plan dir or plan.md in project root"));
    return;
  }
  const entry = addVersion(plan.name, message, content);
  const versionPath = getVersionPath(plan.name, entry.version, entry.hash);
  writeFileSync3(versionPath, content, "utf-8");
  try {
    updateCurrentSymlink(plan.name, entry.version, entry.hash);
  } catch {
    console.log(source_default2.yellow("⚠ Could not create current.md symlink (Windows?)"));
  }
  console.log(source_default2.green(`✓ Committed ${entry.version}-${entry.hash}`));
  console.log(source_default2.gray(`  Message: ${message}`));
  console.log(source_default2.gray(`  Source: ${sourcePath}`));
}
async function logPlan(name) {
  const plan = getPlan(name);
  if (!plan) {
    console.log(source_default2.red(`Plan '${name}' not found`));
    return;
  }
  const history = getVersionHistory(plan.name);
  if (history.length === 0) {
    console.log(source_default2.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }
  console.log(source_default2.bold(`
Plan: ${plan.name}
`));
  for (let i = history.length - 1;i >= 0; i--) {
    const entry = history[i];
    const time = new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const memoryCount = entry.memory_refs.length > 0 ? ` (${entry.memory_refs.length} memories)` : "";
    console.log(source_default2.cyan(`  ${entry.version}-${entry.hash}  ${time}`));
    console.log(source_default2.gray(`    ${entry.message}${memoryCount}`));
    if (entry.parent) {
      console.log(source_default2.gray(`    parent: ${entry.parent}`));
    }
    console.log(source_default2.gray(`    by: @${entry.created_by}`));
    console.log();
  }
}
async function showPlan(name) {
  const plan = getPlan(name);
  if (!plan) {
    console.log(source_default2.red(`Plan '${name}' not found`));
    return;
  }
  const latest = getLatestVersion(plan.name);
  if (!latest) {
    console.log(source_default2.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }
  const versionPath = getVersionPath(plan.name, latest.version, latest.hash);
  if (!existsSync8(versionPath)) {
    console.log(source_default2.red(`Version file not found: ${versionPath}`));
    return;
  }
  const content = readFileSync3(versionPath, "utf-8");
  console.log(source_default2.bold(`
${plan.name} - ${latest.version}
`));
  console.log(source_default2.gray(`Hash: ${latest.hash}`));
  console.log(source_default2.gray(`Message: ${latest.message}`));
  console.log(source_default2.gray(`Created: ${new Date(latest.created_at).toLocaleString()}`));
  if (latest.memory_refs.length > 0) {
    console.log(source_default2.gray(`Memory refs: ${latest.memory_refs.join(", ")}`));
  }
  console.log(source_default2.bold(`
---
`));
  console.log(content);
}
var init_commit = __esm(() => {
  init_source();
  init_registry();
  init_manifest();
  init_config3();
});

// src/plan/commands/link.ts
var exports_link = {};
__export(exports_link, {
  showPlanWithMemory: () => showPlanWithMemory,
  linkMemory: () => linkMemory
});
import { existsSync as existsSync9, readFileSync as readFileSync4 } from "node:fs";
async function resolveMemoryRecord(memoryRef) {
  const config = await readConfig();
  for (const domain of config.domains) {
    const filePath = getExpertisePath(domain);
    const records = await readExpertiseFile(filePath);
    const record = records.find((r) => r.id === memoryRef);
    if (record) {
      switch (record.type) {
        case "convention":
          return `[${domain}] ${record.content}`;
        case "failure":
          return `[${domain}] ${record.description} → ${record.resolution}`;
        case "decision":
          return `[${domain}] ${record.title}: ${record.rationale}`;
      }
    }
  }
  return null;
}
async function linkMemory(planName, memoryRef, version) {
  const plan = getPlan(planName);
  if (!plan) {
    console.log(source_default2.red(`Plan '${planName}' not found`));
    return;
  }
  let targetVersion = version;
  if (!targetVersion) {
    const latest = getLatestVersion(plan.name);
    if (!latest) {
      console.log(source_default2.red("No versions in this plan. Commit first with: am plan commit"));
      return;
    }
    targetVersion = latest.version;
  }
  const versionEntry = getVersion(plan.name, targetVersion);
  if (!versionEntry) {
    console.log(source_default2.red(`Version '${targetVersion}' not found in plan '${planName}'`));
    return;
  }
  addMemoryRef(plan.name, targetVersion, memoryRef);
  const planRef = `${plan.name}:${targetVersion}`;
  await findAndUpdateMemoryPlanRef(memoryRef, planRef);
  console.log(source_default2.green(`✓ Linked ${memoryRef} to ${planRef} (bidirectional)`));
}
async function showPlanWithMemory(name) {
  const plan = getPlan(name);
  if (!plan) {
    console.log(source_default2.red(`Plan '${name}' not found`));
    return;
  }
  const latest = getLatestVersion(plan.name);
  if (!latest) {
    console.log(source_default2.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }
  const versionPath = `${getPlanDir(plan.name)}/v${latest.version}-${latest.hash}.md`;
  if (!existsSync9(versionPath)) {
    console.log(source_default2.red(`Version file not found: ${versionPath}`));
    return;
  }
  const content = readFileSync4(versionPath, "utf-8");
  console.log(source_default2.bold(`
${plan.name} - ${latest.version}
`));
  console.log(source_default2.gray(`Hash: ${latest.hash}`));
  console.log(source_default2.gray(`Message: ${latest.message}`));
  console.log(source_default2.gray(`Created: ${new Date(latest.created_at).toLocaleString()}`));
  if (latest.memory_refs.length > 0) {
    console.log(source_default2.cyan(`
Linked Memories (${latest.memory_refs.length}):`));
    for (const ref of latest.memory_refs) {
      const resolved = await resolveMemoryRecord(ref);
      if (resolved) {
        console.log(source_default2.gray(`  • ${ref}: ${resolved}`));
      } else {
        console.log(source_default2.gray(`  • ${ref} (not found)`));
      }
    }
  }
  console.log(source_default2.bold(`
---
`));
  console.log(content);
}
var init_link = __esm(() => {
  init_source();
  init_registry();
  init_manifest();
  init_config3();
  init_store();
  init_config();
});

// src/plan/commands/timeline.ts
var exports_timeline = {};
__export(exports_timeline, {
  timelinePlan: () => timelinePlan
});
function timelinePlan(name) {
  if (name) {
    showPlanTimeline(name);
  } else {
    showAllPlansTimeline();
  }
}
function showPlanTimeline(name) {
  const plan = getPlan(name);
  if (!plan) {
    console.log(source_default2.red(`Plan '${name}' not found`));
    return;
  }
  const history = getVersionHistory(plan.name);
  if (history.length === 0) {
    console.log(source_default2.yellow("No versions yet. Commit with: am plan commit <name> -m <message>"));
    return;
  }
  console.log(source_default2.bold.cyan(`
╔══════════════════════════════════════════╗`));
  console.log(source_default2.bold.cyan(`║  \uD83D\uDCC5 Timeline: ${plan.name.padEnd(28)}║`));
  console.log(source_default2.bold.cyan(`╚══════════════════════════════════════════╝
`));
  for (let i = history.length - 1;i >= 0; i--) {
    const entry = history[i];
    const isLatest = i === history.length - 1;
    const connector = i === 0 ? "╰" : "╠";
    const branch = i === 0 ? "╯" : "╣";
    const time = new Date(entry.created_at).toLocaleString();
    const versionBadge = isLatest ? source_default2.green("●") : "○";
    console.log(source_default2.gray(`${connector}── ${versionBadge} ${source_default2.bold(entry.version)} ${entry.hash}`));
    console.log(source_default2.gray(`   ${entry.message}`));
    console.log(source_default2.gray(`   by: @${entry.created_by}`));
    if (entry.memory_refs.length > 0) {
      console.log(source_default2.cyan(`   ${branch}── \uD83D\uDCBE Linked memories:`));
      for (const ref of entry.memory_refs.slice(0, 3)) {
        console.log(source_default2.gray(`   ${branch}    • ${ref}`));
      }
      if (entry.memory_refs.length > 3) {
        console.log(source_default2.gray(`   ${branch}    + ${entry.memory_refs.length - 3} more`));
      }
    }
    if (entry.parent) {
      console.log(source_default2.gray(`   ${branch}── ↑ parent: ${entry.parent}`));
    }
    console.log();
  }
  console.log(source_default2.gray("Legend: ● = current, ○ = historical, ↑ = parent version"));
}
function showAllPlansTimeline() {
  const plans = listPlans();
  if (plans.length === 0) {
    console.log(source_default2.yellow("No plans found. Create one with: am plan init <name>"));
    return;
  }
  console.log(source_default2.bold.cyan(`
╔══════════════════════════════════════════╗`));
  console.log(source_default2.bold.cyan(`║  \uD83D\uDCC5 All Plans Timeline               ║`));
  console.log(source_default2.bold.cyan(`╚══════════════════════════════════════════╝
`));
  for (const plan of plans) {
    const history = getVersionHistory(plan.name);
    const versionCount = history.length;
    const latest = history[history.length - 1];
    console.log(source_default2.cyan(`┌── ${source_default2.bold(plan.name)}`));
    console.log(source_default2.gray(`│   creator: @${plan.creator}`));
    console.log(source_default2.gray(`│   versions: ${versionCount}`));
    if (latest) {
      console.log(source_default2.gray(`│   latest: ${latest.version} ${latest.hash}`));
      console.log(source_default2.gray(`│   ${latest.message}`));
      if (latest.memory_refs.length > 0) {
        console.log(source_default2.cyan(`│   \uD83D\uDCBE ${latest.memory_refs.length} linked memories`));
      }
    }
    const isLast = plan === plans[plans.length - 1];
    console.log(source_default2.gray(isLast ? "└" : "├"));
    console.log();
  }
  console.log(source_default2.gray("Use 'am plan timeline <name>' for detailed view of a specific plan"));
}
var init_timeline = __esm(() => {
  init_source();
  init_registry();
  init_manifest();
});

// node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// node_modules/chalk/source/index.js
init_ansi_styles();
init_supports_color();
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === undefined ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk = (...strings) => strings.join(" ");
  applyOptions(chalk, options);
  Object.setPrototypeOf(chalk, createChalk.prototype);
  return chalk;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (const [styleName, style] of Object.entries(ansi_styles_default)) {
  styles2[styleName] = {
    get() {
      const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      Object.defineProperty(this, styleName, { value: builder });
      return builder;
    }
  };
}
styles2.visible = {
  get() {
    const builder = createBuilder(this, this[STYLER], true);
    Object.defineProperty(this, "visible", { value: builder });
    return builder;
  }
};
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
for (const model of usedModels) {
  styles2[model] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      const { level } = this;
      return function(...arguments_) {
        const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {}, {
  ...styles2,
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
});
var createStyler = (open, close, parent) => {
  let openAll;
  let closeAll;
  if (parent === undefined) {
    openAll = open;
    closeAll = close;
  } else {
    openAll = parent.openAll + open;
    closeAll = close + parent.closeAll;
  }
  return {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
};
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
  if (self.level <= 0 || !string) {
    return self[IS_EMPTY] ? "" : string;
  }
  let styler = self[STYLER];
  if (styler === undefined) {
    return string;
  }
  const { openAll, closeAll } = styler;
  if (string.includes("\x1B")) {
    while (styler !== undefined) {
      string = stringReplaceAll(string, styler.close, styler.open);
      styler = styler.parent;
    }
  }
  const lfIndex = string.indexOf(`
`);
  if (lfIndex !== -1) {
    string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
  }
  return openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/index.ts
import { spawn, execFileSync, execSync } from "child_process";
import fs from "fs";
import path from "path";

// src/lib/paths.ts
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
var cachedAgentMuxDir = null;
function findAgentMuxDir(startDir = process.cwd()) {
  let currentDir = startDir;
  const root = "/";
  while (currentDir !== root) {
    const candidate = join(currentDir, ".agentmux");
    if (existsSync(candidate)) {
      return candidate;
    }
    currentDir = dirname(currentDir);
  }
  return null;
}
function getAgentMuxDir() {
  if (cachedAgentMuxDir) {
    return cachedAgentMuxDir;
  }
  const found = findAgentMuxDir();
  if (found) {
    cachedAgentMuxDir = found;
    return found;
  }
  const cwd = process.cwd();
  const defaultDir = join(cwd, ".agentmux");
  cachedAgentMuxDir = defaultDir;
  return defaultDir;
}

// src/lib/format.ts
function formatRecord(record, style = "compact") {
  switch (style) {
    case "compact":
      return formatCompact(record);
    case "full":
      return formatFull(record);
    case "injection":
      return formatForInjection(record);
    default:
      return formatCompact(record);
  }
}
function formatCompact(record) {
  switch (record.type) {
    case "convention":
      return `- ${record.content}`;
    case "failure":
      return `- ${record.description}
  → ${record.resolution}`;
    case "decision":
      return `- **${record.title}**: ${record.rationale}`;
  }
}
function formatFull(record) {
  const base = `[${record.type}] ${record.classification}`;
  switch (record.type) {
    case "convention":
      return `${base}: ${record.content}`;
    case "failure":
      return `${base}: ${record.description} → ${record.resolution}`;
    case "decision":
      return `${base}: ${record.title}: ${record.rationale}`;
  }
}
function formatForInjection(record) {
  switch (record.type) {
    case "convention":
      return `[context] ${record.content}`;
    case "failure":
      return `[context] ${record.description} → ${record.resolution}`;
    case "decision":
      return `[context] ${record.title}: ${record.rationale}`;
  }
}

// src/index.ts
var program2 = new Command;
var MAX_AGENTS = 11;
var STATUS_REFRESH_INTERVAL_MS = 3000;
var STATUS_REFRESH_INTERVAL_S = STATUS_REFRESH_INTERVAL_MS / 1000;
var AGENTS = [
  { name: "status", pane: 0, harness: "monitor", cmd: "" },
  { name: "nui", pane: 1, harness: "opencode", cmd: "opencode" },
  { name: "sam", pane: 2, harness: "opencode", cmd: "opencode" },
  { name: "wit", pane: 3, harness: "claude", cmd: "claude" }
];
var AGENT_PANE_MAP = Object.fromEntries(AGENTS.filter((a) => a.name !== "status").map((a) => [a.name, a.pane]));
var getAgentMuxDir3 = getAgentMuxDir;
function exec(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: "utf-8", ...options });
  } catch (e) {
    return "";
  }
}
function checkTmux() {
  try {
    execSync("which tmux");
    return true;
  } catch {
    console.log(source_default.red("\u274C tmux not found. Install with: brew install tmux"));
    return false;
  }
}
function getSessionName() {
  return process.env.AGENTMUX_SESSION || "agentmux";
}
program2.name("agentmux").description("Ultra-lean multi-agent terminal multiplexer").version("3.0.0");
program2.command("install").description("Install required dependencies (tmux)").action(() => {
  console.log(source_default.blue(`\uD83D\uDD27 Installing AgentMux dependencies...
`));
  const platform = process.platform;
  let installCmd = "";
  if (platform === "darwin") {
    console.log(source_default.gray("Detected macOS"));
    installCmd = "brew install tmux";
  } else if (platform === "linux") {
    console.log(source_default.gray("Detected Linux"));
    installCmd = "sudo apt-get install -y tmux";
  } else {
    console.log(source_default.yellow("\u26A0\uFE0F  Unsupported platform. Please install manually:"));
    console.log(source_default.white("   tmux: https://github.com/tmux/tmux/wiki/Installing"));
    return;
  }
  console.log(source_default.cyan(`Running: ${installCmd}
`));
  try {
    execSync(installCmd, { stdio: "inherit" });
    console.log(source_default.green(`
\u2705 Dependencies installed!`));
    console.log(source_default.gray(`
You can now run:`));
    console.log(source_default.white("   agentmux init <project>"));
    console.log(source_default.white("   agentmux start"));
  } catch (e) {
    console.log(source_default.red(`
\u274C Installation failed`));
    console.log(source_default.gray("Try installing manually:"));
    console.log(source_default.white("   tmux: brew install tmux (macOS) or apt-get install tmux (Linux)"));
  }
});
program2.command("init").description("Initialize a new AgentMux project in current directory").action(() => {
  const agentMuxDir = getAgentMuxDir3();
  const currentDir = process.cwd();
  const name = path.basename(currentDir);
  console.log(source_default.blue(`\uD83C\uDF0A Initializing AgentMux project: ${name}`));
  console.log(source_default.gray(`   Location: ${currentDir}/.agentmux/
`));
  try {
    fs.accessSync(agentMuxDir, fs.constants.F_OK);
    console.log(source_default.yellow("\u26A0\uFE0F  .agentmux/ already exists in this directory"));
    console.log(source_default.gray(`   Use: rm -rf .agentmux && agentmux init to reinitialize
`));
    return;
  } catch {}
  fs.mkdirSync(agentMuxDir, { recursive: true });
  fs.mkdirSync(path.join(agentMuxDir, "shared"), { recursive: true });
  fs.mkdirSync(path.join(agentMuxDir, "workflows"), { recursive: true });
  fs.writeFileSync(path.join(agentMuxDir, "shared", "plan.md"), `# Plan for ${name}

Add your multi-agent plan here.
Use @agent tags to assign tasks.

## @nui
Design the architecture and plan implementation

## @sam
Implement the core functionality

## @wit
Review and test the implementation
`);
  fs.writeFileSync(path.join(agentMuxDir, "shared", "messages.txt"), `# Messages for ${name}

`);
  console.log(source_default.green(`
\u2705 Project initialized!`));
  console.log(source_default.gray(`
Directory structure:`));
  console.log(source_default.white("   .agentmux/"));
  console.log(source_default.white("   \u251C\u2500\u2500 shared/           # Shared context"));
  console.log(source_default.white("   \u2514\u2500\u2500 workflows/        # Agent workflows"));
  console.log(source_default.gray(`
Skills are installed globally in ~/.claude/skills/`));
  console.log(source_default.gray(`Next step: agentmux start`));
});
program2.command("start").description("Start full AgentMux environment with 4 panes").option("--nui", "Enable nui agent", true).option("--no-nui", "Disable nui agent").option("--sam", "Enable sam agent", true).option("--no-sam", "Disable sam agent").option("--wit", "Enable wit agent", true).option("--no-wit", "Disable wit agent").action((options) => {
  if (!checkTmux()) {
    console.log(source_default.red(`
\u274C Missing tmux dependency!`));
    console.log(source_default.white(`Run: agentmux install
`));
    return;
  }
  const agentMuxDir = getAgentMuxDir3();
  try {
    fs.accessSync(agentMuxDir, fs.constants.F_OK);
  } catch {
    console.log(source_default.red(`
\u274C No .agentmux/ directory found!`));
    console.log(source_default.white(`Run: agentmux init
`));
    return;
  }
  const session = getSessionName();
  const currentDir = process.cwd();
  console.log(source_default.blue(`\uD83C\uDF0A Starting AgentMux environment...
`));
  try {
    execFileSync("tmux", ["kill-session", "-t", session], { stdio: "ignore" });
  } catch {}
  console.log(source_default.gray("Creating 4-pane split screen..."));
  execFileSync("tmux", ["new-session", "-d", "-s", session, "-n", "agentmux"]);
  execFileSync("tmux", ["set", "-t", session, "mouse", "on"]);
  console.log(source_default.gray("Creating nui pane..."));
  execFileSync("tmux", ["split-window", "-h", "-t", session]);
  console.log(source_default.gray("Creating sam pane..."));
  execFileSync("tmux", ["select-pane", "-t", `${session}:0.0`]);
  execFileSync("tmux", ["split-window", "-v", "-t", session]);
  console.log(source_default.gray("Creating wit pane..."));
  execFileSync("tmux", ["select-pane", "-t", `${session}:0.1`]);
  execFileSync("tmux", ["split-window", "-v", "-t", session]);
  console.log(source_default.gray("Setting up status pane..."));
  execFileSync("tmux", ["select-pane", "-t", `${session}:0.0`]);
  execFileSync("tmux", ["select-pane", "-t", `${session}:0.0`, "-T", "status"]);
  execFileSync("tmux", ["send-keys", "-t", `${session}:0.0`, `${process.argv[0]} ${process.argv[1]} status`, "C-m"]);
  AGENTS.filter((a) => a.name !== "status").forEach((agent) => {
    const optionKey = agent.name;
    if (options[optionKey]) {
      console.log(source_default.gray(`Starting ${agent.name}...`));
      execFileSync("tmux", ["select-pane", "-t", `${session}:0.${agent.pane}`]);
      execFileSync("tmux", ["select-pane", "-t", `${session}:0.${agent.pane}`, "-T", `${agent.name} (${agent.harness})`]);
      execFileSync("tmux", ["send-keys", "-t", `${session}:0.${agent.pane}`, "clear", "C-m"]);
      const agentCmd = `AGENTMUX_AGENT=${agent.name} AGENTMUX_PROJECT=${currentDir} ${agent.cmd}`;
      execFileSync("tmux", ["send-keys", "-t", `${session}:0.${agent.pane}`, agentCmd, "C-m"]);
    }
  });
  execFileSync("tmux", ["select-layout", "-t", session, "tiled"]);
  console.log(source_default.green(`
\u2705 AgentMux environment ready!`));
  console.log(source_default.yellow(`
\uD83D\uDDA5\uFE0F  Split Screen Layout:`));
  console.log(source_default.white("   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510"));
  console.log(source_default.white("   \u2502       STATUS        \u2502   nui (opencode)    \u2502"));
  console.log(source_default.white("   \u2502     (top-left)      \u2502    (top-right)      \u2502"));
  console.log(source_default.white("   \u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524"));
  console.log(source_default.white("   \u2502   sam (opencode)    \u2502    wit (claude)     \u2502"));
  console.log(source_default.white("   \u2502   (bottom-left)     \u2502   (bottom-right)    \u2502"));
  console.log(source_default.white("   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518"));
  console.log(source_default.blue(`
\uD83D\uDD17 Attaching now...`));
  console.log(source_default.yellow("   \uD83D\uDDB1\uFE0F  MOUSE ENABLED: Click to switch panes!"));
  console.log(source_default.gray("   Ctrl+B + arrow: Move between panes"));
  console.log(source_default.gray("   Ctrl+B + z: Zoom current pane"));
  console.log(source_default.gray(`   Ctrl+B + d: Detach (keep running)
`));
  spawn("tmux", ["attach", "-t", session], { stdio: "inherit" });
});
program2.command("status").description("Show live status with auto-refresh (runs until Ctrl+C)").action(() => {
  const agentMuxDir = getAgentMuxDir3();
  try {
    fs.accessSync(agentMuxDir, fs.constants.F_OK);
  } catch {
    console.log(source_default.red(`
\u274C No .agentmux/ directory found!`));
    console.log(source_default.white(`Run: agentmux init
`));
    return;
  }
  let lastCommitCount = 0;
  let lastUpdateTime = Date.now();
  function renderStatus() {
    console.clear();
    console.log(source_default.blue.bold(`
\uD83D\uDCCA AgentMux Status
`));
    const secondsSinceUpdate = Math.floor((Date.now() - lastUpdateTime) / 1000);
    process.stdout.write(`${source_default.gray(`\u23F1\uFE0F  Last update: ${secondsSinceUpdate}s ago`)}

`);
    console.log(source_default.yellow("Recent Commits:"));
    try {
      const commitsPath = path.join(agentMuxDir, "shared", "commits.txt");
      try {
        fs.accessSync(commitsPath, fs.constants.F_OK);
        const tailOutput = exec(`tail -n 20 "${commitsPath}" 2>/dev/null`);
        if (tailOutput && tailOutput.trim()) {
          const lines = tailOutput.trim().split(`
`).filter((l) => l.trim() && !l.startsWith("#"));
          if (lines.length > 0) {
            lines.reverse().forEach((line) => {
              const match = line.match(/^\[(.*?)\]\s+(\w+)\s+(\S+)\s+(@\w+):\s*(.*?)(?:\s*\|\s*(.*))?$/);
              if (match) {
                const [, timestamp, status, hash, agent, message, reviewer] = match;
                const isReviewed = status === "REVIEWED";
                const symbol = isReviewed ? "\u25CF" : "\u25CB";
                const agentName = agent.replace("@", "");
                const agentColor = agentName === "nui" ? source_default.cyan : agentName === "sam" ? source_default.green : agentName === "wit" ? source_default.magenta : source_default.white;
                const shortHash = hash.substring(0, 7);
                let displayLine = `${shortHash} ${agent}: ${message}`;
                if (reviewer) {
                  displayLine += ` (${reviewer})`;
                }
                console.log(`  ${symbol} ${agentColor(displayLine)}`);
              }
            });
          } else {
            console.log(source_default.gray("  No commits yet"));
          }
        } else {
          console.log(source_default.gray("  No commits yet"));
        }
      } catch {
        console.log(source_default.gray("  No commits yet"));
      }
    } catch (e) {
      console.log(source_default.gray("  No commits yet"));
    }
    console.log(source_default.yellow(`
Active Agents:`));
    try {
      const session = getSessionName();
      const output = execFileSync("tmux", ["list-panes", "-t", session, "-F", "#P: #{pane_current_command}"], { encoding: "utf-8" });
      if (output) {
        const lines = output.trim().split(`
`);
        lines.forEach((line, idx) => {
          const agent = AGENTS[idx];
          const paneName = agent ? `${agent.name} (${agent.harness})` : `Pane ${idx}`;
          const cmd = line.split(":")[1]?.trim() || "idle";
          console.log(`  \u2022 ${paneName}: ${cmd}`);
        });
      } else {
        console.log(source_default.gray("  No active session"));
      }
    } catch {
      console.log(source_default.gray("  No active session"));
    }
    console.log(source_default.yellow(`
Recent Messages:`));
    try {
      const messagesPath = path.join(agentMuxDir, "shared", "messages.txt");
      try {
        fs.accessSync(messagesPath, fs.constants.F_OK);
        const tailOutput = exec(`tail -n 5 "${messagesPath}" 2>/dev/null`);
        if (tailOutput) {
          const lines = tailOutput.trim().split(`
`).filter((l) => l.trim() && !l.startsWith("#"));
          if (lines.length > 0) {
            lines.forEach((line) => {
              const match = line.match(/^\[(.*?)\] (.*)$/);
              if (match) {
                const timestamp = new Date(match[1]);
                const msg = match[2];
                const ago = Math.floor((Date.now() - timestamp.getTime()) / 1000);
                const timeStr = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : `${Math.floor(ago / 3600)}h ago`;
                console.log(`  ${source_default.gray(`[${timeStr}]`)} ${msg}`);
              } else {
                console.log(`  ${line}`);
              }
            });
          } else {
            console.log(source_default.gray("  No messages yet"));
          }
        } else {
          console.log(source_default.gray("  No messages"));
        }
      } catch {
        console.log(source_default.gray("  No messages"));
      }
    } catch {
      console.log(source_default.gray("  No messages"));
    }
    console.log(source_default.gray(`
  [Auto-refreshes every ${STATUS_REFRESH_INTERVAL_S}s... Press Ctrl+C to exit]
`));
  }
  renderStatus();
  const pollInterval = setInterval(() => {
    try {
      const commitsPath = path.join(agentMuxDir, "shared", "commits.txt");
      const stats = fs.statSync(commitsPath);
      const currentCount = stats.mtime.getTime();
      if (currentCount !== lastCommitCount) {
        lastCommitCount = currentCount;
        lastUpdateTime = Date.now();
      }
    } catch {}
    renderStatus();
  }, STATUS_REFRESH_INTERVAL_MS);
  process.on("SIGINT", () => {
    clearInterval(pollInterval);
    console.log(source_default.gray(`

\uD83D\uDC4B Status monitor stopped
`));
    process.exit(0);
  });
});
program2.command("send <to> <message...>").option("--inject", "Inject relevant memory context into message (opt-in)").description("Send a message to another agent (uses tmux send-keys)").action(async (to, message, options) => {
  if (!checkTmux())
    return;
  const session = getSessionName();
  const msg = message.join(" ");
  const from = process.env.AGENTMUX_AGENT || "user";
  const agentMuxDir = getAgentMuxDir3();
  let contextInjection = "";
  if (options.inject === true) {
    try {
      const { readConfig: readConfig3, getExpertisePath: getExpertisePath3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
      const { readExpertiseFile: readExpertiseFile3 } = await Promise.resolve().then(() => (init_store2(), exports_store));
      const { matchMemories: matchMemories2, formatMemoryForInjection: formatMemoryForInjection2 } = await Promise.resolve().then(() => (init_matcher(), exports_matcher));
      const config = await readConfig3();
      const allRecords = [];
      for (const domain of config.domains) {
        const filePath = getExpertisePath3(domain);
        const records = await readExpertiseFile3(filePath);
        allRecords.push(...records);
      }
      const matched = matchMemories2(allRecords, msg, 2);
      if (matched.length > 0) {
        contextInjection = `

` + matched.map(formatMemoryForInjection2).join(`
`);
      }
    } catch (e) {
      console.error(source_default.yellow(`Warning: context injection failed: ${e instanceof Error ? e.message : e}`));
    }
  }
  const displayMsg = `\uD83D\uDCE8 [@${from} \u2192 @${to}]: ${msg}${contextInjection}`;
  const timestamp = new Date().toISOString();
  try {
    const paneNum = AGENT_PANE_MAP[to.toLowerCase()];
    if (paneNum !== undefined) {
      execFileSync("tmux", ["send-keys", "-t", `${session}:0.${paneNum}`, "-l", displayMsg]);
      execFileSync("tmux", ["send-keys", "-t", `${session}:0.${paneNum}`, "Enter"]);
      console.log(source_default.green(`\u2705 Message sent to ${to}`));
      if (contextInjection) {
        console.log(source_default.gray(`  + context hints injected`));
      }
      const messagesPath = path.join(agentMuxDir, "shared", "messages.txt");
      const logEntry = `[${timestamp}] ${displayMsg}
`;
      fs.appendFileSync(messagesPath, logEntry);
    } else {
      console.log(source_default.red(`\u274C Unknown agent: ${to}. Try: status, nui, sam, wit`));
    }
  } catch (e) {
    console.log(source_default.red(`\u274C Failed to send to ${to}. Is the session running?`));
  }
});
program2.command("whoami").description("Show current agent identity").action(() => {
  const agent = process.env.AGENTMUX_AGENT || "unknown";
  const project = process.env.AGENTMUX_PROJECT || "unknown";
  const agentConfig = AGENTS.find((a) => a.name === agent);
  const harness = agentConfig?.harness || "unknown";
  console.log(`${agent} (${harness}) @ ${project}`);
});
program2.command("workflow [name]").description("List, show, or install workflows").option("--install", "Install workflow from GitHub").action((name, options) => {
  const agentMuxDir = getAgentMuxDir3();
  const workflowsDir = path.join(agentMuxDir, "workflows");
  if (!fs.existsSync(workflowsDir)) {
    fs.mkdirSync(workflowsDir, { recursive: true });
  }
  if (options.install && name) {
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      console.log(source_default.red(`\u274C Invalid workflow name: '${name}'`));
      console.log(source_default.gray("   Workflow names can only contain letters, numbers, hyphens, and underscores"));
      return;
    }
    console.log(source_default.blue(`\uD83D\uDD27 Installing workflow: ${name}`));
    const workflowUrl = `https://raw.githubusercontent.com/dpbmaverick98/agentmux/main/workflows/${name}/SKILL.md`;
    const targetDir = path.join(workflowsDir, name);
    const targetPath = path.join(targetDir, "SKILL.md");
    try {
      if (fs.existsSync(targetPath)) {
        console.log(source_default.yellow(`\u26A0\uFE0F  Workflow '${name}' is already installed`));
        console.log(source_default.gray(`   Location: ${targetPath}`));
        return;
      }
      fs.mkdirSync(targetDir, { recursive: true });
      try {
        execSync(`curl -fsSL "${workflowUrl}" -o "${targetPath}"`, { stdio: "inherit" });
        console.log(source_default.green(`\u2705 Workflow '${name}' installed successfully`));
        console.log(source_default.gray(`   Location: ${targetPath}`));
        console.log(source_default.gray(`   Usage: agentmux workflow ${name}`));
      } catch {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(source_default.red(`\u274C Failed to download workflow '${name}'`));
        console.log(source_default.gray(`   URL: ${workflowUrl}`));
        console.log(source_default.gray(`   Make sure the workflow exists in the repository`));
      }
    } catch (e) {
      console.log(source_default.red(`\u274C Failed to install workflow: ${e}`));
    }
  } else if (name) {
    const workflowPath = path.join(workflowsDir, name, "SKILL.md");
    try {
      if (fs.existsSync(workflowPath)) {
        const content = fs.readFileSync(workflowPath, "utf-8");
        console.log(source_default.blue(`
\uD83D\uDCCB Workflow: ${name}
`));
        console.log(content);
      } else {
        console.log(source_default.red(`\u274C Workflow '${name}' not found`));
        console.log(source_default.gray(`   Install with: agentmux workflow ${name} --install`));
        const installed = fs.readdirSync(workflowsDir).filter((f) => {
          const stat3 = fs.statSync(path.join(workflowsDir, f));
          return stat3.isDirectory() && fs.existsSync(path.join(workflowsDir, f, "SKILL.md"));
        });
        if (installed.length > 0) {
          console.log(source_default.gray(`
   Installed workflows:`));
          installed.forEach((w) => console.log(source_default.gray(`     - ${w}`)));
        }
      }
    } catch (e) {
      console.log(source_default.red(`\u274C Failed to read workflow: ${e}`));
    }
  } else {
    console.log(source_default.blue(`
\uD83D\uDCCB Installed Workflows
`));
    try {
      const workflows = [];
      if (fs.existsSync(workflowsDir)) {
        const entries = fs.readdirSync(workflowsDir);
        for (const entry of entries) {
          const workflowPath = path.join(workflowsDir, entry, "SKILL.md");
          if (fs.existsSync(workflowPath)) {
            workflows.push(entry);
          }
        }
      }
      if (workflows.length === 0) {
        console.log(source_default.gray("  No workflows installed"));
        console.log(source_default.gray(`
  Install workflows from GitHub:`));
        console.log(source_default.white("    agentmux workflow <name> --install"));
      } else {
        workflows.forEach((w) => {
          console.log(`  \u2713 ${source_default.bold(w)}`);
        });
        console.log(source_default.gray(`
  View workflow: agentmux workflow <name>`));
      }
      console.log(source_default.gray(`
  Available workflows on GitHub:`));
      console.log(source_default.gray("    - detailed-commits"));
    } catch (e) {
      console.log(source_default.red("\u274C Failed to list workflows"));
    }
  }
});
program2.command("install-deps").description("Install all required dependencies (claude, opencode, tmux, bun)").action(() => {
  console.log(source_default.blue(`\uD83D\uDD27 Installing AgentMux dependencies...
`));
  const platform = process.platform;
  if (platform !== "darwin") {
    console.log(source_default.yellow("\u26A0\uFE0F  This installer currently only supports macOS"));
    console.log(source_default.gray("   Please install manually:"));
    console.log(source_default.white("   - claude: npm install -g @anthropic-ai/claude-cli"));
    console.log(source_default.white("   - opencode: npm install -g opencode"));
    console.log(source_default.white("   - tmux: brew install tmux"));
    console.log(source_default.white("   - bun: curl -fsSL https://bun.sh/install | bash"));
    return;
  }
  const dependencies = [
    { name: "claude", installCmd: "npm install -g @anthropic-ai/claude-cli" },
    { name: "opencode", installCmd: "npm install -g opencode" },
    { name: "tmux", installCmd: "brew install tmux" },
    { name: "bun", installCmd: "curl -fsSL https://bun.sh/install | bash" }
  ];
  let installed = [];
  let skipped = [];
  for (const dep of dependencies) {
    try {
      execSync(`which ${dep.name}`);
      skipped.push(dep.name);
    } catch {
      console.log(source_default.gray(`Installing ${dep.name}...`));
      execSync(dep.installCmd, { stdio: "inherit" });
      installed.push(dep.name);
    }
  }
  console.log(source_default.green(`
\u2705 Dependency check complete!`));
  if (installed.length > 0) {
    console.log(source_default.green(`   Installed: ${installed.join(", ")}`));
  }
  if (skipped.length > 0) {
    console.log(source_default.gray(`   Already present: ${skipped.join(", ")}`));
  }
});
program2.command("list").description("List all agents with their status and harness").action(() => {
  console.log(source_default.blue(`
\uD83D\uDCCB AgentMux Agents
`));
  const session = getSessionName();
  const spawnedWindows = [];
  try {
    const output = execFileSync("tmux", ["list-panes", "-t", session, "-F", "#P: #{pane_current_command}"], { encoding: "utf-8" });
    const paneCommands = {};
    if (output) {
      output.trim().split(`
`).forEach((line) => {
        const [paneNum, ...cmdParts] = line.split(":");
        paneCommands[paneNum.trim()] = cmdParts.join(":").trim();
      });
    }
    console.log(source_default.yellow("Fixed Panes:"));
    AGENTS.forEach((agent) => {
      const cmd = paneCommands[agent.pane.toString()] || "not running";
      const status = cmd !== "not running" ? source_default.green("\u25CF running") : source_default.gray("\u25CB offline");
      console.log(`  Pane ${agent.pane}: ${source_default.bold(agent.name)} (${agent.harness}) - ${status}`);
      console.log(`           ${source_default.gray(cmd)}`);
    });
    try {
      const windowsOutput = execFileSync("tmux", ["list-windows", "-t", session, "-F", "#I: #W"], { encoding: "utf-8" });
      if (windowsOutput) {
        windowsOutput.trim().split(`
`).forEach((line) => {
          const [winId, ...nameParts] = line.split(":");
          const windowName = nameParts.join(":").trim();
          if (windowName !== "agentmux" && !AGENTS.find((a) => a.name === windowName)) {
            spawnedWindows.push({
              id: winId.trim(),
              name: windowName,
              harness: "unknown"
            });
          }
        });
      }
      if (spawnedWindows.length > 0) {
        console.log(source_default.yellow(`
Spawned Windows:`));
        spawnedWindows.forEach((win) => {
          console.log(`  Window ${win.id}: ${source_default.bold(win.name)} (${win.harness}) - ${source_default.green("\u25CF running")}`);
        });
      }
    } catch {}
    const totalAgents = AGENTS.length + spawnedWindows.length;
    console.log(source_default.gray(`
Total: ${totalAgents}/${MAX_AGENTS} agents`));
    console.log();
    console.log(source_default.gray("Quick commands:"));
    console.log(`  ${source_default.cyan('agentmux send nui "message"')}  - Send to nui`);
    console.log(`  ${source_default.cyan("agentmux spawn opencode max")}  - Spawn new agent`);
    console.log(`  ${source_default.cyan("agentmux kill sam")}            - Kill specific agent`);
    console.log(`  ${source_default.cyan("agentmux stop")}                - Kill all agents`);
    console.log();
  } catch (e) {
    console.log(source_default.red(`\u274C No active AgentMux session. Run: agentmux start
`));
  }
});
program2.command("stop").description("Stop the AgentMux tmux session").action(() => {
  const session = getSessionName();
  try {
    execFileSync("tmux", ["kill-session", "-t", session], { stdio: "ignore" });
    console.log(source_default.green(`
\u2705 AgentMux session stopped
`));
  } catch {
    console.log(source_default.yellow(`
\u26A0\uFE0F  No active AgentMux session found
`));
  }
});
program2.command("spawn <harness> <agent-name>").description(`Spawn a new agent in a new tmux window (max ${MAX_AGENTS} total agents)`).action((harness, agentName) => {
  if (!checkTmux())
    return;
  if (harness !== "opencode" && harness !== "claude") {
    console.log(source_default.red(`
\u274C Invalid harness. Use: opencode or claude
`));
    return;
  }
  const session = getSessionName();
  const currentDir = process.cwd();
  try {
    execFileSync("tmux", ["has-session", "-t", session], { stdio: "ignore" });
  } catch {
    console.log(source_default.red(`
\u274C No active AgentMux session. Run: agentmux start
`));
    return;
  }
  try {
    const windowsOutput = execFileSync("tmux", ["list-windows", "-t", session, "-F", "#{window_name}"], { encoding: "utf-8" });
    const windowCount = windowsOutput.trim().split(`
`).filter((w) => w !== "agentmux").length;
    if (windowCount >= MAX_AGENTS - AGENTS.length) {
      console.log(source_default.red(`
\u274C Agent limit reached (${MAX_AGENTS} max). Kill an agent first.
`));
      return;
    }
  } catch {}
  try {
    const windowsOutput = execFileSync("tmux", ["list-windows", "-t", session, "-F", "#{window_name}"], { encoding: "utf-8" });
    const windows = windowsOutput.trim().split(`
`);
    if (windows.includes(agentName)) {
      console.log(source_default.red(`
\u274C Agent "${agentName}" already exists
`));
      return;
    }
  } catch {}
  console.log(source_default.blue(`
\uD83C\uDF0A Spawning ${agentName} (${harness})...
`));
  try {
    execFileSync("tmux", ["new-window", "-t", session, "-n", agentName]);
    const cmd = `AGENTMUX_AGENT=${agentName} AGENTMUX_PROJECT=${currentDir} ${harness}`;
    execFileSync("tmux", ["send-keys", "-t", `${session}:${agentName}`, cmd, "C-m"]);
    console.log(source_default.green(`\u2705 Agent "${agentName}" spawned successfully!`));
    console.log(source_default.gray(`   Window: ${agentName}`));
    console.log(source_default.gray(`   Harness: ${harness}`));
    console.log(source_default.gray(`   Switch: Ctrl+B w (then select ${agentName})
`));
  } catch (e) {
    console.log(source_default.red(`
\u274C Failed to spawn agent: ${e}
`));
  }
});
program2.command("kill <agent-name>").description("Kill a specific agent window").action((agentName) => {
  if (!checkTmux())
    return;
  const session = getSessionName();
  try {
    execFileSync("tmux", ["has-session", "-t", session], { stdio: "ignore" });
  } catch {
    console.log(source_default.red(`
\u274C No active AgentMux session.
`));
    return;
  }
  console.log(source_default.blue(`
\uD83D\uDC80 Killing ${agentName}...`));
  try {
    try {
      const windowsOutput = execFileSync("tmux", ["list-windows", "-t", session, "-F", "#{window_name}"], { encoding: "utf-8" });
      const windows = windowsOutput.trim().split(`
`);
      if (windows.includes(agentName)) {
        execFileSync("tmux", ["kill-window", "-t", `${session}:${agentName}`]);
        console.log(source_default.green(`\u2705 Agent "${agentName}" killed
`));
        return;
      }
    } catch {}
    if (AGENT_PANE_MAP[agentName] !== undefined) {
      execFileSync("tmux", ["kill-pane", "-t", `${session}:0.${AGENT_PANE_MAP[agentName]}`]);
      console.log(source_default.green(`\u2705 Agent "${agentName}" killed
`));
      return;
    }
    console.log(source_default.red(`
\u274C Agent "${agentName}" not found
`));
  } catch (e) {
    console.log(source_default.red(`
\u274C Failed to kill agent: ${e}
`));
  }
});
var memoryProgram = new Command;
memoryProgram.name("memory").description("Structured expertise management for agents").version("1.0.0");
memoryProgram.command("init").description("Initialize agentmux memory storage").action(async () => {
  const { existsSync: existsSync10 } = await import("fs");
  const { ensureExpertiseDir: ensureExpertiseDir3, readConfig: readConfig3, writeConfig: writeConfig3, getExpertisePath: getExpertisePath3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { createExpertiseFile: createExpertiseFile3 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  await ensureExpertiseDir3();
  const config = await readConfig3();
  for (const domain of config.domains) {
    const filePath = getExpertisePath3(domain);
    if (!existsSync10(filePath)) {
      await createExpertiseFile3(filePath);
    }
  }
  console.log(source_default.green("\u2713 Initialized agentmux memory storage"));
  console.log(source_default.dim(`  Domains: ${config.domains.join(", ")}`));
  console.log(source_default.dim(`  Storage: .agentmux/expertise/`));
});
memoryProgram.command("add").argument("<domain>", "domain to add").description("Add a new expertise domain").action(async (domain) => {
  const { ensureExpertiseDir: ensureExpertiseDir3, readConfig: readConfig3, writeConfig: writeConfig3, getExpertisePath: getExpertisePath3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { createExpertiseFile: createExpertiseFile3 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  await ensureExpertiseDir3();
  const config = await readConfig3();
  if (config.domains.includes(domain)) {
    console.log(source_default.yellow(`Domain "${domain}" already exists.`));
    return;
  }
  config.domains.push(domain);
  await writeConfig3(config);
  const filePath = getExpertisePath3(domain);
  await createExpertiseFile3(filePath);
  console.log(source_default.green(`\u2713 Added domain "${domain}"`));
});
memoryProgram.command("record").argument("<domain>", "expertise domain").argument("[content]", "record content").option("--type <type>", "record type (convention, failure, decision)", "convention").option("--classification <classification>", "classification level", "tactical").option("--description <description>", "description of the record").option("--resolution <resolution>", "resolution for failure records").option("--title <title>", "title for decision records").option("--rationale <rationale>", "rationale for decision records").option("--tags <tags>", "comma-separated tags").option("--force", "force recording even if duplicate exists").option("--dry-run", "preview what would be recorded without writing").description("Record an expertise record").action(async (domain, content, options) => {
  const { ensureExpertiseDir: ensureExpertiseDir3, getExpertisePath: getExpertisePath3, readConfig: readConfig3, addDomain: addDomain3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { appendRecord: appendRecord2, findDuplicate: findDuplicate2, readExpertiseFile: readExpertiseFile3 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  await ensureExpertiseDir3();
  const config = await readConfig3();
  if (!config.domains.includes(domain)) {
    await addDomain3(domain);
    console.log(source_default.green(`\u2713 Auto-created domain "${domain}"`));
  }
  const recordedBy = process.env.AGENTMUX_AGENT || "unknown";
  const recordedAt = new Date().toISOString();
  const tags = typeof options.tags === "string" ? options.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
  let record;
  const recordType = options.type;
  const classification = options.classification || "tactical";
  switch (recordType) {
    case "convention": {
      const conventionContent = content || options.description;
      if (!conventionContent) {
        console.error(source_default.red("Error: convention records require content or --description"));
        process.exitCode = 1;
        return;
      }
      record = {
        type: "convention",
        content: conventionContent,
        classification,
        recorded_at: recordedAt,
        recorded_by: recordedBy,
        ...tags && tags.length > 0 && { tags }
      };
      break;
    }
    case "failure": {
      const failureDesc = options.description;
      const failureResolution = options.resolution;
      if (!failureDesc || !failureResolution) {
        console.error(source_default.red("Error: failure records require --description and --resolution"));
        process.exitCode = 1;
        return;
      }
      record = {
        type: "failure",
        description: failureDesc,
        resolution: failureResolution,
        classification,
        recorded_at: recordedAt,
        recorded_by: recordedBy,
        ...tags && tags.length > 0 && { tags }
      };
      break;
    }
    case "decision": {
      const decisionTitle = options.title;
      const decisionRationale = options.rationale;
      if (!decisionTitle || !decisionRationale) {
        console.error(source_default.red("Error: decision records require --title and --rationale"));
        process.exitCode = 1;
        return;
      }
      record = {
        type: "decision",
        title: decisionTitle,
        rationale: decisionRationale,
        classification,
        recorded_at: recordedAt,
        recorded_by: recordedBy,
        ...tags && tags.length > 0 && { tags }
      };
      break;
    }
    default:
      console.error(source_default.red(`Error: Unknown record type "${recordType}". Valid types: convention, failure, decision`));
      process.exitCode = 1;
      return;
  }
  const filePath = getExpertisePath3(domain);
  const dryRun = options.dryRun === true;
  if (dryRun) {
    const existing = await readExpertiseFile3(filePath);
    const dup = findDuplicate2(existing, record);
    if (dup && !options.force) {
      console.log(source_default.yellow(`Dry-run: Duplicate ${recordType} already exists in ${domain}. Would skip.`));
    } else {
      console.log(source_default.green(`\u2713 Dry-run: Would create ${recordType} in ${domain}`));
    }
    console.log(source_default.dim("  Run without --dry-run to apply changes."));
  } else {
    const existing = await readExpertiseFile3(filePath);
    const dup = findDuplicate2(existing, record);
    if (dup && !options.force) {
      console.log(source_default.yellow(`Duplicate ${recordType} already exists in ${domain}. Use --force to add anyway.`));
    } else {
      await appendRecord2(filePath, record);
      console.log(source_default.green(`\u2713 Recorded ${recordType} in ${domain}`));
    }
  }
});
memoryProgram.command("query").argument("[domain]", "expertise domain to query (or --all for all)").option("--type <type>", "filter by record type").option("--classification <classification>", "filter by classification").option("--all", "show all domains").option("--plan <plan>", "filter by plan reference (e.g., @sam/api-design)").description("Query expertise records (use --all to see all domains)").action(async (domain, options) => {
  const { readConfig: readConfig3, getExpertisePath: getExpertisePath3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { readExpertiseFile: readExpertiseFile3, getFileModTime: getFileModTime2, filterByType: filterByType2, filterByClassification: filterByClassification2 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  const config = await readConfig3();
  const domainsToQuery = [];
  if (options.all) {
    domainsToQuery.push(...config.domains);
    if (domainsToQuery.length === 0) {
      console.log("No domains configured. Run `am memory init` first.");
      return;
    }
  } else if (domain) {
    if (!config.domains.includes(domain)) {
      console.error(source_default.red(`Error: Domain "${domain}" not found.`));
      console.error(`Hint: Run \`am memory add ${domain}\` to create.`);
      process.exitCode = 1;
      return;
    }
    domainsToQuery.push(domain);
  } else {
    console.error(source_default.red("Error: Please specify a domain or use --all"));
    process.exitCode = 1;
    return;
  }
  function filterByPlan(records, planRef) {
    return records.filter((r) => r.plan_refs && r.plan_refs.some((ref) => ref.includes(planRef)));
  }
  for (const d of domainsToQuery) {
    const filePath = getExpertisePath3(d);
    let records = await readExpertiseFile3(filePath);
    const lastUpdated = await getFileModTime2(filePath);
    if (options.type) {
      records = filterByType2(records, options.type);
    }
    if (options.classification) {
      records = filterByClassification2(records, options.classification);
    }
    if (options.plan) {
      records = filterByPlan(records, options.plan);
    }
    if (records.length > 0) {
      console.log(`
## ${d}`);
      if (lastUpdated) {
        const ago = Math.floor((Date.now() - lastUpdated.getTime()) / 3600000);
        console.log(`(${records.length} entries, updated ${ago}h ago)`);
      }
      const byType = { convention: [], failure: [], decision: [] };
      for (const r of records) {
        byType[r.type].push(r);
      }
      if (byType.convention.length > 0) {
        console.log(`
### Conventions`);
        for (const r of byType.convention)
          console.log(formatRecord(r));
      }
      if (byType.failure.length > 0) {
        console.log(`
### Known Failures`);
        for (const r of byType.failure)
          console.log(formatRecord(r));
      }
      if (byType.decision.length > 0) {
        console.log(`
### Decisions`);
        for (const r of byType.decision)
          console.log(formatRecord(r));
      }
    }
  }
});
memoryProgram.command("prime").argument("[domains...]", "domain(s) to include").option("--compact", "condensed output (default)").option("--full", "include full details").option("--exclude <domains...>", "domains to exclude").description("Generate agent-optimized context for injection").action(async (domainsArg, options) => {
  const { readConfig: readConfig3, getExpertisePath: getExpertisePath3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { readExpertiseFile: readExpertiseFile3 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  const config = await readConfig3();
  const excluded = options.exclude || [];
  let targetDomains = domainsArg && domainsArg.length > 0 ? domainsArg.filter((d) => !excluded.includes(d)) : config.domains.filter((d) => !excluded.includes(d));
  if (targetDomains.length === 0) {
    console.log("No domains to prime.");
    return;
  }
  const sections = [];
  for (const domain of targetDomains) {
    const filePath = getExpertisePath3(domain);
    const records = await readExpertiseFile3(filePath);
    if (records.length === 0)
      continue;
    const lines = [];
    lines.push(`## ${domain}`);
    const byType = {
      convention: [],
      failure: [],
      decision: []
    };
    for (const r of records) {
      byType[r.type].push(r);
    }
    const style = options.full ? "full" : "compact";
    const formatter = (r) => formatRecord(r, style);
    if (byType.convention.length > 0) {
      lines.push(`
### Conventions`);
      for (const r of byType.convention)
        lines.push(formatter(r));
    }
    if (byType.failure.length > 0) {
      lines.push(`
### Known Failures`);
      for (const r of byType.failure)
        lines.push(formatter(r));
    }
    if (byType.decision.length > 0) {
      lines.push(`
### Decisions`);
      for (const r of byType.decision)
        lines.push(formatter(r));
    }
    sections.push(lines.join(`
`));
  }
  if (sections.length > 0) {
    console.log(`# AgentMux Memory Context
`);
    console.log(sections.join(`

`));
    console.log("\n---\n*Run `am memory query --all` to see full records. Record learnings with `am memory record`*");
  } else {
    console.log("No records found in specified domains.");
  }
});
memoryProgram.command("status").description("Show memory status - record counts and last updated").action(async () => {
  const { readConfig: readConfig3, getExpertisePath: getExpertisePath3, getExpertiseDir: getExpertiseDir3 } = await Promise.resolve().then(() => (init_config2(), exports_config2));
  const { readExpertiseFile: readExpertiseFile3, getFileModTime: getFileModTime2 } = await Promise.resolve().then(() => (init_store2(), exports_store));
  const config = await readConfig3();
  const expertiseDir = getExpertiseDir3();
  if (!fs.existsSync(expertiseDir)) {
    console.log(source_default.yellow("No .agentmux/expertise/ found. Run `am memory init` first."));
    return;
  }
  console.log(source_default.bold(`
# AgentMux Memory Status
`));
  let totalRecords = 0;
  for (const domain of config.domains) {
    const filePath = getExpertisePath3(domain);
    const records = await readExpertiseFile3(filePath);
    const lastUpdated = await getFileModTime2(filePath);
    totalRecords += records.length;
    const countStr = source_default.white(`${records.length} records`);
    let timeStr = source_default.gray("(no data)");
    if (lastUpdated) {
      const ago = Math.floor((Date.now() - lastUpdated.getTime()) / 3600000);
      if (ago < 1) {
        const mins = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
        timeStr = source_default.gray(`(${mins}m ago)`);
      } else if (ago < 24) {
        timeStr = source_default.gray(`(${ago}h ago)`);
      } else {
        const days = Math.floor(ago / 24);
        timeStr = source_default.gray(`(${days}d ago)`);
      }
    }
    console.log(`  ${source_default.cyan(domain.padEnd(15))} ${countStr} ${timeStr}`);
  }
  console.log(source_default.dim(`
  Total: ${totalRecords} records across ${config.domains.length} domains`));
  console.log(source_default.dim(`  Storage: ${expertiseDir}
`));
});
program2.addCommand(memoryProgram);
var planProgram = new Command;
planProgram.name("plan").description("Versioned plan management for multi-agent collaboration").version("1.0.0");
planProgram.command("init").argument("<name>", "plan name").description("Create a new plan").action(async (name) => {
  const { initPlan: initPlan2 } = await Promise.resolve().then(() => (init_init(), exports_init));
  await initPlan2(name);
});
planProgram.command("list").description("List all plans").action(async () => {
  const { listPlanCommand: listPlanCommand2 } = await Promise.resolve().then(() => (init_init(), exports_init));
  await listPlanCommand2();
});
planProgram.command("commit").argument("<name>", "plan name").option("-m, --message <message>", "commit message").description("Commit current plan.md as new version").action(async (name, options) => {
  const { commitPlan: commitPlan2 } = await Promise.resolve().then(() => (init_commit(), exports_commit));
  const message = options.message || `Update ${name}`;
  await commitPlan2(name, message);
});
planProgram.command("log").argument("<name>", "plan name").description("Show version history").action(async (name) => {
  const { logPlan: logPlan2 } = await Promise.resolve().then(() => (init_commit(), exports_commit));
  await logPlan2(name);
});
planProgram.command("show").argument("<name>", "plan name").option("--with-memory", "show linked memory records").description("Show current plan version").action(async (name, options) => {
  if (options.withMemory) {
    const { showPlanWithMemory: showPlanWithMemory2 } = await Promise.resolve().then(() => (init_link(), exports_link));
    await showPlanWithMemory2(name);
  } else {
    const { showPlan: showPlan2 } = await Promise.resolve().then(() => (init_commit(), exports_commit));
    await showPlan2(name);
  }
});
planProgram.command("link").argument("<plan>", "plan name").option("--memory <ref>", "memory reference ID (e.g., am-8f2d)").option("--version <version>", "specific version (default: current)").description("Link memory record to plan version").action(async (plan, options) => {
  if (!options.memory) {
    console.log(source_default.red("Error: --memory <ref> is required"));
    console.log(source_default.gray("Example: am plan link api-design --memory am-8f2d"));
    return;
  }
  const { linkMemory: linkMemory2 } = await Promise.resolve().then(() => (init_link(), exports_link));
  await linkMemory2(plan, options.memory, options.version);
});
planProgram.command("timeline").argument("[name]", "plan name (optional, shows all plans if omitted)").description("Show ASCII timeline of plan evolution").action(async (name) => {
  const { timelinePlan: timelinePlan2 } = await Promise.resolve().then(() => (init_timeline(), exports_timeline));
  timelinePlan2(name);
});
program2.addCommand(planProgram);
program2.parse();
