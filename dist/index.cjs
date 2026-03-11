"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/pluralize/pluralize.js
var require_pluralize = __commonJS({
  "node_modules/pluralize/pluralize.js"(exports2, module2) {
    "use strict";
    (function(root, pluralize2) {
      if (typeof require === "function" && typeof exports2 === "object" && typeof module2 === "object") {
        module2.exports = pluralize2();
      } else if (typeof define === "function" && define.amd) {
        define(function() {
          return pluralize2();
        });
      } else {
        root.pluralize = pluralize2();
      }
    })(exports2, function() {
      var pluralRules = [];
      var singularRules = [];
      var uncountables = {};
      var irregularPlurals = {};
      var irregularSingles = {};
      function toTitleCase(str) {
        return str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();
      }
      function sanitizeRule(rule) {
        if (typeof rule === "string") {
          return new RegExp("^" + rule + "$", "i");
        }
        return rule;
      }
      function restoreCase(word, token) {
        if (word === token) {
          return token;
        }
        if (word === word.toUpperCase()) {
          return token.toUpperCase();
        }
        if (word[0] === word[0].toUpperCase()) {
          return toTitleCase(token);
        }
        return token.toLowerCase();
      }
      function interpolate(str, args) {
        return str.replace(/\$(\d{1,2})/g, function(match, index) {
          return args[index] || "";
        });
      }
      function sanitizeWord(token, word, collection) {
        if (!token.length || uncountables.hasOwnProperty(token)) {
          return word;
        }
        var len = collection.length;
        while (len--) {
          var rule = collection[len];
          if (rule[0].test(word)) {
            return word.replace(rule[0], function(match, index, word2) {
              var result = interpolate(rule[1], arguments);
              if (match === "") {
                return restoreCase(word2[index - 1], result);
              }
              return restoreCase(match, result);
            });
          }
        }
        return word;
      }
      function replaceWord(replaceMap, keepMap, rules) {
        return function(word) {
          var token = word.toLowerCase();
          if (keepMap.hasOwnProperty(token)) {
            return restoreCase(word, token);
          }
          if (replaceMap.hasOwnProperty(token)) {
            return restoreCase(word, replaceMap[token]);
          }
          return sanitizeWord(token, word, rules);
        };
      }
      function pluralize2(word, count, inclusive) {
        var pluralized = count === 1 ? pluralize2.singular(word) : pluralize2.plural(word);
        return (inclusive ? count + " " : "") + pluralized;
      }
      pluralize2.plural = replaceWord(
        irregularSingles,
        irregularPlurals,
        pluralRules
      );
      pluralize2.singular = replaceWord(
        irregularPlurals,
        irregularSingles,
        singularRules
      );
      pluralize2.addPluralRule = function(rule, replacement) {
        pluralRules.push([sanitizeRule(rule), replacement]);
      };
      pluralize2.addSingularRule = function(rule, replacement) {
        singularRules.push([sanitizeRule(rule), replacement]);
      };
      pluralize2.addUncountableRule = function(word) {
        if (typeof word === "string") {
          uncountables[word.toLowerCase()] = true;
          return;
        }
        pluralize2.addPluralRule(word, "$0");
        pluralize2.addSingularRule(word, "$0");
      };
      pluralize2.addIrregularRule = function(single, plural) {
        plural = plural.toLowerCase();
        single = single.toLowerCase();
        irregularSingles[single] = plural;
        irregularPlurals[plural] = single;
      };
      [
        // Pronouns.
        ["I", "we"],
        ["me", "us"],
        ["he", "they"],
        ["she", "they"],
        ["them", "them"],
        ["myself", "ourselves"],
        ["yourself", "yourselves"],
        ["itself", "themselves"],
        ["herself", "themselves"],
        ["himself", "themselves"],
        ["themself", "themselves"],
        ["is", "are"],
        ["was", "were"],
        ["has", "have"],
        ["this", "these"],
        ["that", "those"],
        // Words ending in with a consonant and `o`.
        ["echo", "echoes"],
        ["dingo", "dingoes"],
        ["volcano", "volcanoes"],
        ["tornado", "tornadoes"],
        ["torpedo", "torpedoes"],
        // Ends with `us`.
        ["genus", "genera"],
        ["viscus", "viscera"],
        // Ends with `ma`.
        ["stigma", "stigmata"],
        ["stoma", "stomata"],
        ["dogma", "dogmata"],
        ["lemma", "lemmata"],
        ["schema", "schemata"],
        ["anathema", "anathemata"],
        // Other irregular rules.
        ["ox", "oxen"],
        ["axe", "axes"],
        ["die", "dice"],
        ["yes", "yeses"],
        ["foot", "feet"],
        ["eave", "eaves"],
        ["goose", "geese"],
        ["tooth", "teeth"],
        ["quiz", "quizzes"],
        ["human", "humans"],
        ["proof", "proofs"],
        ["carve", "carves"],
        ["valve", "valves"],
        ["looey", "looies"],
        ["thief", "thieves"],
        ["groove", "grooves"],
        ["pickaxe", "pickaxes"],
        ["whiskey", "whiskies"]
      ].forEach(function(rule) {
        return pluralize2.addIrregularRule(rule[0], rule[1]);
      });
      [
        [/s?$/i, "s"],
        [/([^aeiou]ese)$/i, "$1"],
        [/(ax|test)is$/i, "$1es"],
        [/(alias|[^aou]us|tlas|gas|ris)$/i, "$1es"],
        [/(e[mn]u)s?$/i, "$1s"],
        [/([^l]ias|[aeiou]las|[emjzr]as|[iu]am)$/i, "$1"],
        [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, "$1i"],
        [/(alumn|alg|vertebr)(?:a|ae)$/i, "$1ae"],
        [/(seraph|cherub)(?:im)?$/i, "$1im"],
        [/(her|at|gr)o$/i, "$1oes"],
        [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, "$1a"],
        [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, "$1a"],
        [/sis$/i, "ses"],
        [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, "$1$2ves"],
        [/([^aeiouy]|qu)y$/i, "$1ies"],
        [/([^ch][ieo][ln])ey$/i, "$1ies"],
        [/(x|ch|ss|sh|zz)$/i, "$1es"],
        [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, "$1ices"],
        [/(m|l)(?:ice|ouse)$/i, "$1ice"],
        [/(pe)(?:rson|ople)$/i, "$1ople"],
        [/(child)(?:ren)?$/i, "$1ren"],
        [/eaux$/i, "$0"],
        [/m[ae]n$/i, "men"],
        ["thou", "you"]
      ].forEach(function(rule) {
        return pluralize2.addPluralRule(rule[0], rule[1]);
      });
      [
        [/s$/i, ""],
        [/(ss)$/i, "$1"],
        [/((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)(?:sis|ses)$/i, "$1sis"],
        [/(^analy)(?:sis|ses)$/i, "$1sis"],
        [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, "$1fe"],
        [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, "$1f"],
        [/ies$/i, "y"],
        [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, "$1ie"],
        [/\b(mon|smil)ies$/i, "$1ey"],
        [/(m|l)ice$/i, "$1ouse"],
        [/(seraph|cherub)im$/i, "$1"],
        [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|tlas|gas|(?:her|at|gr)o|ris)(?:es)?$/i, "$1"],
        [/(e[mn]u)s?$/i, "$1"],
        [/(movie|twelve)s$/i, "$1"],
        [/(cris|test|diagnos)(?:is|es)$/i, "$1is"],
        [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, "$1us"],
        [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, "$1um"],
        [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, "$1on"],
        [/(alumn|alg|vertebr)ae$/i, "$1a"],
        [/(cod|mur|sil|vert|ind)ices$/i, "$1ex"],
        [/(matr|append)ices$/i, "$1ix"],
        [/(pe)(rson|ople)$/i, "$1rson"],
        [/(child)ren$/i, "$1"],
        [/(eau)x?$/i, "$1"],
        [/men$/i, "man"]
      ].forEach(function(rule) {
        return pluralize2.addSingularRule(rule[0], rule[1]);
      });
      [
        // Singular words with no plurals.
        "advice",
        "adulthood",
        "agenda",
        "aid",
        "alcohol",
        "ammo",
        "athletics",
        "bison",
        "blood",
        "bream",
        "buffalo",
        "butter",
        "carp",
        "cash",
        "chassis",
        "chess",
        "clothing",
        "commerce",
        "cod",
        "cooperation",
        "corps",
        "digestion",
        "debris",
        "diabetes",
        "energy",
        "equipment",
        "elk",
        "excretion",
        "expertise",
        "flounder",
        "fun",
        "gallows",
        "garbage",
        "graffiti",
        "headquarters",
        "health",
        "herpes",
        "highjinks",
        "homework",
        "housework",
        "information",
        "jeans",
        "justice",
        "kudos",
        "labour",
        "literature",
        "machinery",
        "mackerel",
        "mail",
        "media",
        "mews",
        "moose",
        "music",
        "news",
        "pike",
        "plankton",
        "pliers",
        "pollution",
        "premises",
        "rain",
        "research",
        "rice",
        "salmon",
        "scissors",
        "series",
        "sewage",
        "shambles",
        "shrimp",
        "species",
        "staff",
        "swine",
        "trout",
        "traffic",
        "transporation",
        "tuna",
        "wealth",
        "welfare",
        "whiting",
        "wildebeest",
        "wildlife",
        "you",
        // Regexes.
        /pox$/i,
        // "chickpox", "smallpox"
        /ois$/i,
        /deer$/i,
        // "deer", "reindeer"
        /fish$/i,
        // "fish", "blowfish", "angelfish"
        /sheep$/i,
        /measles$/i,
        /[^aeiou]ese$/i
        // "chinese", "japanese"
      ].forEach(pluralize2.addUncountableRule);
      return pluralize2;
    });
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  buildSchema: () => buildSchema
});
module.exports = __toCommonJS(index_exports);
var import_drizzle_orm7 = require("drizzle-orm");
var import_mysql_core3 = require("drizzle-orm/mysql-core");
var import_pg_core3 = require("drizzle-orm/pg-core");
var import_sqlite_core3 = require("drizzle-orm/sqlite-core");
var import_graphql7 = require("graphql");

// src/util/builders/mysql.ts
var import_drizzle_orm4 = require("drizzle-orm");
var import_mysql_core2 = require("drizzle-orm/mysql-core");
var import_graphql4 = require("graphql");
var import_graphql_parse_resolve_info = require("graphql-parse-resolve-info");

// src/util/builders/common.ts
var import_drizzle_orm3 = require("drizzle-orm");
var import_graphql3 = require("graphql");

// src/util/case-ops/index.ts
var import_pluralize = __toESM(require_pluralize(), 1);
var uncapitalize = (input) => input?.length ? `${input[0].toLocaleLowerCase()}${input.length > 1 ? input.slice(1, input.length) : ""}` : input;
var capitalize = (input) => input?.length ? `${input[0].toLocaleUpperCase()}${input.length > 1 ? input.slice(1, input.length) : ""}` : input;
var singularize = (input) => import_pluralize.default.singular(input);
var cleanTableName = (input) => singularize(uncapitalize(input));

// src/util/data-mappers/index.ts
var import_drizzle_orm = require("drizzle-orm");
var import_graphql = require("graphql");
var remapToGraphQLCore = (key, value, tableName, column, relationMap) => {
  if (Array.isArray(value)) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key];
      return remapToGraphQLArrayOutput(
        value,
        rel.targetTableName,
        rel.relation?.targetTable ?? rel.relation?.referencedTable,
        relationMap
      );
    }
  }
  if (typeof value === "object" && value !== null) {
    const relations = relationMap?.[tableName];
    if (relations?.[key]) {
      const rel = relations[key];
      const remapped = remapToGraphQLSingleOutput(
        value,
        rel.targetTableName,
        rel.relation?.targetTable ?? rel.relation?.referencedTable,
        relationMap
      );
      return remapped;
    }
  }
  if (!column) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Buffer) {
    return Array.from(value);
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    if (column.columnType === "PgGeometry" || column.columnType === "PgVector") {
      return value;
    }
    return value.map((arrVal) => remapToGraphQLCore(key, arrVal, tableName, column, relationMap));
  }
  if (typeof value === "object" && value !== null) {
    if (column.columnType === "PgGeometryObject") {
      return value;
    }
    return JSON.stringify(value);
  }
  return value;
};
var remapToGraphQLSingleOutput = (queryOutput, tableName, table, relationMap) => {
  for (const [key, value] of Object.entries(queryOutput)) {
    if (value === void 0 || value === null) {
      delete queryOutput[key];
      continue;
    }
    const column = table[key];
    if (value === 0n && column && column.columnType === "SQLiteBigInt" && !column.notNull) {
      delete queryOutput[key];
      continue;
    }
    queryOutput[key] = remapToGraphQLCore(key, value, tableName, column, relationMap);
  }
  return queryOutput;
};
var remapToGraphQLArrayOutput = (queryOutput, tableName, table, relationMap) => {
  for (const entry of queryOutput) {
    remapToGraphQLSingleOutput(entry, tableName, table, relationMap);
  }
  return queryOutput;
};
var remapFromGraphQLCore = (value, column, columnName) => {
  const dataType = column.dataType ?? "";
  const columnType = column.columnType ?? "";
  const isTimestampColumn = columnType === "SQLiteTimestamp" || columnType === "SQLiteTimestampMs" || columnType === "MySqlTimestamp" || columnType === "MySqlDateTime" || columnType === "PgTimestamp" || columnType === "PgTimestampString";
  if (isTimestampColumn) {
    const formatted = new Date(value);
    if (Number.isNaN(formatted.getTime())) {
      throw new import_graphql.GraphQLError(`Field '${columnName}' is not a valid date!`);
    }
    return formatted;
  }
  const isDateOnlyColumn = columnType === "MySqlDate" || columnType === "PgDate";
  if (isDateOnlyColumn && typeof value === "string") {
    const dateOnly = value.includes("T") ? value.split("T")[0] : value;
    const check = new Date(dateOnly);
    if (Number.isNaN(check.getTime())) {
      throw new import_graphql.GraphQLError(`Field '${columnName}' is not a valid date!`);
    }
    return dateOnly;
  }
  if (dataType.includes("bigint")) {
    try {
      return BigInt(value);
    } catch {
      throw new import_graphql.GraphQLError(`Field '${columnName}' is not a BigInt!`);
    }
  }
  if (dataType.includes("json") && column.columnType !== "PgGeometryObject") {
    if (typeof value !== "string") {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (e) {
      throw new import_graphql.GraphQLError(
        `Invalid JSON in field '${columnName}':
${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  }
  switch (dataType) {
    case "date": {
      const formatted = new Date(value);
      if (Number.isNaN(formatted.getTime())) {
        throw new import_graphql.GraphQLError(`Field '${columnName}' is not a valid date!`);
      }
      return formatted;
    }
    case "buffer": {
      if (!Array.isArray(value)) {
        throw new import_graphql.GraphQLError(`Field '${columnName}' is not an array!`);
      }
      return Buffer.from(value);
    }
    case "json": {
      if (column.columnType === "PgGeometryObject") {
        return value;
      }
      try {
        return JSON.parse(value);
      } catch (e) {
        throw new import_graphql.GraphQLError(
          `Invalid JSON in field '${columnName}':
${e instanceof Error ? e.message : "Unknown error"}`
        );
      }
    }
    case "array": {
      if (!Array.isArray(value)) {
        throw new import_graphql.GraphQLError(`Field '${columnName}' is not an array!`);
      }
      if (column.columnType === "PgGeometry" && value.length !== 2) {
        throw new import_graphql.GraphQLError(
          `Invalid float tuple in field '${columnName}': expected array with length of 2, received ${value.length}`
        );
      }
      return value;
    }
    case "bigint": {
      try {
        return BigInt(value);
      } catch (_error) {
        throw new import_graphql.GraphQLError(`Field '${columnName}' is not a BigInt!`);
      }
    }
    default: {
      return value;
    }
  }
};
var remapFromGraphQLSingleInput = (queryInput, table) => {
  for (const [key, value] of Object.entries(queryInput)) {
    if (value === void 0) {
      delete queryInput[key];
    } else {
      const column = (0, import_drizzle_orm.getTableColumns)(table)[key];
      if (!column) {
        throw new import_graphql.GraphQLError(`Unknown column: ${key}`);
      }
      if (value === null && column.notNull) {
        delete queryInput[key];
        continue;
      }
      queryInput[key] = remapFromGraphQLCore(value, column, key);
    }
  }
  return queryInput;
};
var remapFromGraphQLArrayInput = (queryInput, table) => {
  for (const entry of queryInput) {
    remapFromGraphQLSingleInput(entry, table);
  }
  return queryInput;
};

// src/util/type-converter/index.ts
var import_drizzle_orm2 = require("drizzle-orm");
var import_mysql_core = require("drizzle-orm/mysql-core");
var import_pg_core = require("drizzle-orm/pg-core");
var import_sqlite_core = require("drizzle-orm/sqlite-core");
var import_graphql2 = require("graphql");
var import_graphql_scalars = require("graphql-scalars");
var allowedNameChars = /^[a-zA-Z0-9_]+$/;
var enumMap = /* @__PURE__ */ new WeakMap();
var generateEnumCached = (column, columnName, tableName) => {
  if (enumMap.has(column)) {
    return enumMap.get(column);
  }
  const gqlEnum = new import_graphql2.GraphQLEnumType({
    name: `${capitalize(tableName)}${capitalize(columnName)}Enum`,
    values: Object.fromEntries(
      column.enumValues.map((e, index) => [
        allowedNameChars.test(e) ? e : `Option${index}`,
        {
          value: e,
          description: `Value: ${e}`
        }
      ])
    )
  });
  enumMap.set(column, gqlEnum);
  return gqlEnum;
};
var geoXyType = new import_graphql2.GraphQLObjectType({
  name: "PgGeometryObject",
  fields: {
    x: { type: import_graphql2.GraphQLFloat },
    y: { type: import_graphql2.GraphQLFloat }
  }
});
var geoXyInputType = new import_graphql2.GraphQLInputObjectType({
  name: "PgGeometryObjectInput",
  fields: {
    x: { type: import_graphql2.GraphQLFloat },
    y: { type: import_graphql2.GraphQLFloat }
  }
});
var columnToGraphQLCore = (column, columnName, tableName, isInput) => {
  const { type: baseType } = (0, import_drizzle_orm2.extractExtendedColumnType)(column);
  switch (baseType) {
    case "boolean":
      return { type: import_graphql2.GraphQLBoolean, description: "Boolean" };
    case "object":
      if (column instanceof import_pg_core.PgTimestamp) {
        return { type: import_graphql_scalars.GraphQLDateTime, description: "DateTime" };
      }
      return column.columnType === "PgGeometryObject" ? {
        type: isInput ? geoXyInputType : geoXyType,
        description: "Geometry points XY"
      } : column.columnType === "PgBytea" ? {
        type: new import_graphql2.GraphQLList(new import_graphql2.GraphQLNonNull(import_graphql2.GraphQLInt)),
        description: "Buffer"
      } : { type: import_graphql2.GraphQLString, description: "JSON" };
    case "string":
      if (column.enumValues?.length) {
        return { type: generateEnumCached(column, columnName, tableName) };
      }
      if (column instanceof import_pg_core.PgTimestamp || column instanceof import_pg_core.PgTimestampString) {
        return { type: import_graphql_scalars.GraphQLDateTime, description: "DateTime" };
      }
      if (column instanceof import_pg_core.PgDateString) {
        return { type: import_graphql_scalars.GraphQLDate, description: "Date" };
      }
      return { type: import_graphql2.GraphQLString, description: "String" };
    case "bigint":
      return { type: import_graphql2.GraphQLString, description: "BigInt" };
    case "number":
      return (0, import_drizzle_orm2.is)(column, import_pg_core.PgInteger) || (0, import_drizzle_orm2.is)(column, import_pg_core.PgSerial) || (0, import_drizzle_orm2.is)(column, import_mysql_core.MySqlInt) || (0, import_drizzle_orm2.is)(column, import_mysql_core.MySqlSerial) || (0, import_drizzle_orm2.is)(column, import_sqlite_core.SQLiteInteger) ? { type: import_graphql2.GraphQLInt, description: "Integer" } : { type: import_graphql2.GraphQLFloat, description: "Float" };
    case "array": {
      if (column.columnType === "PgVector") {
        return {
          type: new import_graphql2.GraphQLList(new import_graphql2.GraphQLNonNull(import_graphql2.GraphQLFloat)),
          description: "Array<Float>"
        };
      }
      if (column.columnType === "PgGeometry") {
        return {
          type: new import_graphql2.GraphQLList(new import_graphql2.GraphQLNonNull(import_graphql2.GraphQLFloat)),
          description: "Tuple<[Float, Float]>"
        };
      }
      const innerType = columnToGraphQLCore(
        column.baseColumn,
        columnName,
        tableName,
        isInput
      );
      return {
        type: new import_graphql2.GraphQLList(new import_graphql2.GraphQLNonNull(innerType.type)),
        description: `Array<${innerType.description}>`
      };
    }
    default:
      throw new Error(`Drizzle-GraphQL Error: Type ${column.dataType} is not implemented!`);
  }
};
var drizzleRelationToGraphQLInsertType = (tables, relationMap) => {
  if (!relationMap) {
    return null;
  }
  for (const [tableName, _val] of Object.entries(relationMap)) {
    const table = tables[tableName];
    if (!table) {
      continue;
    }
    const columns = (0, import_drizzle_orm2.getColumns)(table);
    const columnEntries = Object.entries(columns).filter(([_key, value]) => value.primary);
    const _connectFields = Object.fromEntries(
      columnEntries.map(([columnName, columnDescription]) => [
        columnName,
        drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true)
      ])
    );
  }
};
var drizzleColumnToGraphQLType = (column, columnName, tableName, forceNullable = false, defaultIsNullable = false, isInput = false) => {
  const typeDesc = columnToGraphQLCore(column, columnName, tableName, isInput);
  const noDesc = ["string", "boolean", "number"];
  const { type: baseType } = (0, import_drizzle_orm2.extractExtendedColumnType)(column);
  if (noDesc.find((e) => e === baseType)) {
    delete typeDesc.description;
  }
  if (forceNullable) {
    return typeDesc;
  }
  if (column.notNull && !(defaultIsNullable && (column.hasDefault || column.defaultFn))) {
    return {
      type: new import_graphql2.GraphQLNonNull(typeDesc.type),
      description: typeDesc.description
    };
  }
  return typeDesc;
};

// src/util/builders/common.ts
var rqbCrashTypes = ["SQLiteBigInt", "SQLiteBlobJson", "SQLiteBlobBuffer"];
var extractSelectedColumnsFromTree = (tree, table) => {
  const tableColumns = (0, import_drizzle_orm3.getColumns)(table);
  const treeEntries = Object.entries(tree);
  const selectedColumns = [];
  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }
    selectedColumns.push([fieldData.name, true]);
  }
  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName = columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0][0];
    selectedColumns.push([columnName, true]);
  }
  return Object.fromEntries(selectedColumns);
};
var extractSelectedColumnsFromTreeSQLFormat = (tree, table) => {
  const tableColumns = (0, import_drizzle_orm3.getColumns)(table);
  const treeEntries = Object.entries(tree);
  const selectedColumns = [];
  for (const [_fieldName, fieldData] of treeEntries) {
    if (!tableColumns[fieldData.name]) {
      continue;
    }
    selectedColumns.push([fieldData.name, tableColumns[fieldData.name]]);
  }
  if (!selectedColumns.length) {
    const columnKeys = Object.entries(tableColumns);
    const columnName = columnKeys.find((e) => rqbCrashTypes.find((haram) => e[1].columnType !== haram))?.[0] ?? columnKeys[0][0];
    selectedColumns.push([columnName, tableColumns[columnName]]);
  }
  return Object.fromEntries(selectedColumns);
};
var innerOrder = new import_graphql3.GraphQLInputObjectType({
  name: "InnerOrder",
  fields: {
    direction: {
      type: new import_graphql3.GraphQLNonNull(
        new import_graphql3.GraphQLEnumType({
          name: "OrderDirection",
          description: "Order by direction",
          values: {
            asc: {
              value: "asc",
              description: "Ascending order"
            },
            desc: {
              value: "desc",
              description: "Descending order"
            }
          }
        })
      )
    },
    priority: {
      type: new import_graphql3.GraphQLNonNull(import_graphql3.GraphQLInt),
      description: "Priority of current field"
    }
  }
});
var resolveGenericFilterName = (column, columnName, columnGraphQLType) => {
  if (columnName === "id" || columnName.endsWith("Id")) {
    return "Id";
  }
  if (columnGraphQLType.type === import_graphql3.GraphQLBoolean) {
    return "Boolean";
  }
  if (columnGraphQLType.type instanceof import_graphql3.GraphQLEnumType) {
    return columnGraphQLType.type.name;
  }
  const ct = column.columnType ?? "";
  if (ct === "PgTimestamp" || ct === "PgTimestampString" || ct === "PgDate") {
    return "DateTime";
  }
  return "String";
};
var generateColumnFilterValues = (column, tableName, columnName, cacheCtx) => {
  const columnGraphQLType = drizzleColumnToGraphQLType(column, columnName, tableName, true, false, true);
  const genericName = resolveGenericFilterName(column, columnName, columnGraphQLType);
  const cached = cacheCtx.genericFilterCache.get(genericName);
  if (cached) {
    return cached.main;
  }
  const colType = columnGraphQLType.type;
  const colDesc = columnGraphQLType.description;
  const colArr = new import_graphql3.GraphQLList(new import_graphql3.GraphQLNonNull(colType));
  const isId = genericName === "Id";
  const baseFields = {
    eq: { type: colType, description: colDesc },
    ne: { type: colType, description: colDesc },
    lt: { type: colType, description: colDesc },
    lte: { type: colType, description: colDesc },
    gt: { type: colType, description: colDesc },
    gte: { type: colType, description: colDesc },
    ...isId ? {} : {
      like: { type: import_graphql3.GraphQLString },
      notLike: { type: import_graphql3.GraphQLString },
      ilike: { type: import_graphql3.GraphQLString },
      notIlike: { type: import_graphql3.GraphQLString }
    },
    inArray: { type: colArr, description: `Array<${colDesc}>` },
    notInArray: { type: colArr, description: `Array<${colDesc}>` },
    isNull: { type: import_graphql3.GraphQLBoolean },
    isNotNull: { type: import_graphql3.GraphQLBoolean }
  };
  const orType = new import_graphql3.GraphQLInputObjectType({
    name: `${genericName}FilterOr`,
    fields: { ...baseFields }
  });
  const mainType = new import_graphql3.GraphQLInputObjectType({
    name: `${genericName}Filter`,
    fields: {
      ...baseFields,
      OR: {
        type: new import_graphql3.GraphQLList(new import_graphql3.GraphQLNonNull(orType))
      }
    }
  });
  cacheCtx.genericFilterCache.set(genericName, { main: mainType, or: orType });
  return mainType;
};
var orderMap = /* @__PURE__ */ new WeakMap();
var generateTableOrderCached = (table) => {
  if (orderMap.has(table)) {
    return orderMap.get(table);
  }
  let remapped = {};
  try {
    const columns = (0, import_drizzle_orm3.getColumns)(table);
    const columnEntries = Object.entries(columns);
    remapped = Object.fromEntries(
      columnEntries.map(([columnName, _columnDescription]) => [columnName, { type: innerOrder }])
    );
    orderMap.set(table, remapped);
  } catch (_err) {
  }
  return remapped;
};
var filterMap = /* @__PURE__ */ new WeakMap();
var generateTableFilterValuesCached = (table, tableName, cacheCtx) => {
  if (filterMap.has(table)) {
    return filterMap.get(table);
  }
  const columns = (0, import_drizzle_orm3.getColumns)(table);
  const columnEntries = Object.entries(columns);
  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      {
        type: generateColumnFilterValues(columnDescription, tableName, columnName, cacheCtx)
      }
    ])
  );
  filterMap.set(table, remapped);
  return remapped;
};
var fieldMap = /* @__PURE__ */ new WeakMap();
var generateTableSelectTypeFieldsCached = (table, tableName) => {
  if (fieldMap.has(table)) {
    return fieldMap.get(table);
  }
  const columns = (0, import_drizzle_orm3.getColumns)(table);
  const columnEntries = Object.entries(columns);
  const remapped = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName)
    ])
  );
  fieldMap.set(table, remapped);
  return remapped;
};
var orderTypeMap = /* @__PURE__ */ new WeakMap();
var generateTableOrderTypeCached = (table, tableName) => {
  if (orderTypeMap.has(table)) {
    return orderTypeMap.get(table);
  }
  const orderColumns = generateTableOrderCached(table);
  const order = new import_graphql3.GraphQLInputObjectType({
    name: `${capitalize(tableName)}OrderBy`,
    fields: orderColumns
  });
  orderTypeMap.set(table, order);
  return order;
};
var filterTypeMap = /* @__PURE__ */ new WeakMap();
var generateTableFilterTypeCached = (table, tableName, cacheCtx) => {
  if (filterTypeMap.has(table)) {
    return filterTypeMap.get(table);
  }
  const filterColumns = generateTableFilterValuesCached(table, tableName, cacheCtx);
  const filters = new import_graphql3.GraphQLInputObjectType({
    name: `${capitalize(tableName)}Filters`,
    fields: {
      ...filterColumns,
      OR: {
        type: new import_graphql3.GraphQLList(
          new import_graphql3.GraphQLNonNull(
            new import_graphql3.GraphQLInputObjectType({
              name: `${capitalize(tableName)}FiltersOr`,
              fields: filterColumns
            })
          )
        )
      }
    }
  });
  filterTypeMap.set(table, filters);
  return filters;
};
var generateSelectFields = (tables, tableName, relationMap, fromTableName, fromRelationName, withOrder, _relationsDepthLimit, cacheCtx, usedTables = /* @__PURE__ */ new Set()) => {
  const table = tables[tableName];
  const order = withOrder ? generateTableOrderTypeCached(table, tableName) : void 0;
  const filters = generateTableFilterTypeCached(table, tableName, cacheCtx);
  const tableFields = generateTableSelectTypeFieldsCached(table, tableName);
  const relationsForTable = relationMap[tableName];
  const relationEntries = relationsForTable ? Object.entries(relationsForTable.relations) : [];
  if (usedTables.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {}
    };
  }
  const isRootCall = fromTableName === "" && fromRelationName === "";
  if (isRootCall && cacheCtx.objectTypeCache.has(tableName)) {
    return {
      order,
      filters,
      tableFields,
      relationFields: {}
    };
  }
  let relationFields = {};
  if (isRootCall) {
    const typeName = `${capitalize(tableName)}SelectItem`;
    const shell = new import_graphql3.GraphQLObjectType({
      name: typeName,
      fields: () => ({ ...tableFields, ...relationFields })
    });
    cacheCtx.objectTypeCache.set(tableName, shell);
  }
  if (relationEntries.length > 0) {
    const rawRelationFields = [];
    const nextUsedTables = new Set(usedTables);
    nextUsedTables.add(tableName);
    for (const [relationName, relEntry] of relationEntries) {
      const { targetTableName } = relEntry;
      const relation = relEntry.relation ?? relEntry;
      const isOne = (0, import_drizzle_orm3.is)(relation, import_drizzle_orm3.One);
      const relSelectData = generateSelectFields(
        tables,
        targetTableName,
        relationMap,
        tableName,
        // fromTableName for the relation type
        relationName,
        // fromRelationName for the relation type
        !isOne,
        void 0,
        cacheCtx,
        nextUsedTables
      );
      const relCacheKey = `${tableName}::${relationName}`;
      const relTypeName = `${capitalize(tableName)}${capitalize(relationName)}Relation`;
      let relType = cacheCtx.relationTypeCache.get(relCacheKey);
      if (!relType) {
        relType = new import_graphql3.GraphQLObjectType({
          name: relTypeName,
          fields: { ...relSelectData.tableFields, ...relSelectData.relationFields }
        });
        cacheCtx.relationTypeCache.set(relCacheKey, relType);
      }
      if (isOne) {
        rawRelationFields.push([
          relationName,
          {
            type: relType,
            args: {
              where: { type: relSelectData.filters }
            }
          }
        ]);
        continue;
      }
      rawRelationFields.push([
        relationName,
        {
          type: new import_graphql3.GraphQLNonNull(new import_graphql3.GraphQLList(new import_graphql3.GraphQLNonNull(relType))),
          args: {
            where: { type: relSelectData.filters },
            orderBy: { type: relSelectData.order },
            offset: { type: import_graphql3.GraphQLInt },
            limit: { type: import_graphql3.GraphQLInt }
          }
        }
      ]);
    }
    relationFields = Object.fromEntries(rawRelationFields);
  }
  return {
    order,
    filters,
    tableFields,
    relationFields
  };
};
var generateTableTypes = (tableName, tables, relationMap, withReturning, relationsDepthLimit, cacheCtx) => {
  const { tableFields, relationFields, filters, order } = generateSelectFields(
    tables,
    tableName,
    relationMap,
    "",
    // root call: no fromTableName
    "",
    // root call: no fromRelationName
    true,
    relationsDepthLimit,
    cacheCtx
  );
  const table = tables[tableName];
  const columns = (0, import_drizzle_orm3.getColumns)(table);
  const columnEntries = Object.entries(columns);
  const _insertNested = drizzleRelationToGraphQLInsertType(tables, relationMap[tableName] ?? {});
  const insertFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, false, true, true)
    ])
  );
  const updateFields = Object.fromEntries(
    columnEntries.map(([columnName, columnDescription]) => [
      columnName,
      drizzleColumnToGraphQLType(columnDescription, columnName, tableName, true, false, true)
    ])
  );
  const insertInput = new import_graphql3.GraphQLInputObjectType({
    name: `${capitalize(tableName)}InsertInput`,
    fields: insertFields
  });
  const updateInput = new import_graphql3.GraphQLInputObjectType({
    name: `${capitalize(tableName)}UpdateInput`,
    fields: updateFields
  });
  const selectSingleOutput = cacheCtx.objectTypeCache.get(tableName) ?? new import_graphql3.GraphQLObjectType({
    name: `${capitalize(tableName)}SelectItem`,
    fields: { ...tableFields, ...relationFields }
  });
  const selectArrOutput = new import_graphql3.GraphQLNonNull(new import_graphql3.GraphQLList(new import_graphql3.GraphQLNonNull(selectSingleOutput)));
  const singleTableItemOutput = withReturning ? new import_graphql3.GraphQLObjectType({
    name: `${capitalize(tableName)}Item`,
    fields: tableFields
  }) : void 0;
  const arrTableItemOutput = withReturning ? new import_graphql3.GraphQLNonNull(new import_graphql3.GraphQLList(new import_graphql3.GraphQLNonNull(singleTableItemOutput))) : void 0;
  const inputs = {
    insertInput,
    updateInput,
    tableOrder: order,
    tableFilters: filters
  };
  const outputs = withReturning ? {
    selectSingleOutput,
    selectArrOutput,
    singleTableItemOutput,
    arrTableItemOutput
  } : {
    selectSingleOutput,
    selectArrOutput
  };
  return {
    inputs,
    outputs
  };
};
var extractOrderBy = (table, orderArgs) => {
  const res = [];
  for (const [column, config] of Object.entries(orderArgs).sort(
    (a, b) => (b[1]?.priority ?? 0) - (a[1]?.priority ?? 0)
  )) {
    if (!config) {
      continue;
    }
    const { direction } = config;
    res.push(direction === "asc" ? (0, import_drizzle_orm3.asc)((0, import_drizzle_orm3.getColumns)(table)[column]) : (0, import_drizzle_orm3.desc)((0, import_drizzle_orm3.getColumns)(table)[column]));
  }
  return res;
};
var extractFiltersColumn = (column, columnName, operators) => {
  if (!operators.OR?.length) {
    delete operators.OR;
  }
  const entries = Object.entries(operators);
  if (operators.OR) {
    if (entries.length > 1) {
      throw new import_graphql3.GraphQLError(`WHERE ${columnName}: Cannot specify both fields and 'OR' in column operators!`);
    }
    const variants2 = [];
    for (const variant of operators.OR) {
      const extracted = extractFiltersColumn(column, columnName, variant);
      if (extracted) {
        variants2.push(extracted);
      }
    }
    return variants2.length ? variants2.length > 1 ? (0, import_drizzle_orm3.or)(...variants2) : variants2[0] : void 0;
  }
  const variants = [];
  for (const [operatorName, operatorValue] of entries) {
    if (operatorValue === null || operatorValue === false) {
      continue;
    }
    let operator;
    switch (operatorName) {
      case "eq":
        operator = operator ?? import_drizzle_orm3.eq;
      case "ne":
        operator = operator ?? import_drizzle_orm3.ne;
      case "gt":
        operator = operator ?? import_drizzle_orm3.gt;
      case "gte":
        operator = operator ?? import_drizzle_orm3.gte;
      case "lt":
        operator = operator ?? import_drizzle_orm3.lt;
      case "lte": {
        operator = operator ?? import_drizzle_orm3.lte;
        const singleValue = remapFromGraphQLCore(operatorValue, column, columnName);
        variants.push(operator(column, singleValue));
        break;
      }
      case "like":
        operator = operator ?? import_drizzle_orm3.like;
      case "notLike":
        operator = operator ?? import_drizzle_orm3.notLike;
      case "ilike":
        operator = operator ?? import_drizzle_orm3.ilike;
      case "notIlike":
        operator = operator ?? import_drizzle_orm3.notIlike;
        variants.push(operator(column, operatorValue));
        break;
      case "inArray":
        operator = operator ?? import_drizzle_orm3.inArray;
      case "notInArray": {
        operator = operator ?? import_drizzle_orm3.notInArray;
        if (!operatorValue.length) {
          throw new import_graphql3.GraphQLError(`WHERE ${columnName}: Unable to use operator ${operatorName} with an empty array!`);
        }
        const arrayValue = operatorValue.map((val) => remapFromGraphQLCore(val, column, columnName));
        variants.push(operator(column, arrayValue));
        break;
      }
      case "isNull":
        operator = operator ?? import_drizzle_orm3.isNull;
      case "isNotNull":
        operator = operator ?? import_drizzle_orm3.isNotNull;
        variants.push(operator(column));
    }
  }
  return variants.length ? variants.length > 1 ? (0, import_drizzle_orm3.and)(...variants) : variants[0] : void 0;
};
var extractFilters = (table, tableName, filters) => {
  if (!filters.OR?.length) {
    delete filters.OR;
  }
  const entries = Object.entries(filters);
  if (!entries.length) {
    return;
  }
  if (filters.OR) {
    if (entries.length > 1) {
      throw new import_graphql3.GraphQLError(`WHERE ${tableName}: Cannot specify both fields and 'OR' in table filters!`);
    }
    const variants2 = [];
    for (const variant of filters.OR) {
      const extracted = extractFilters(table, tableName, variant);
      if (extracted) {
        variants2.push(extracted);
      }
    }
    return variants2.length ? variants2.length > 1 ? (0, import_drizzle_orm3.or)(...variants2) : variants2[0] : void 0;
  }
  const variants = [];
  for (const [columnName, operators] of entries) {
    if (operators === null) {
      continue;
    }
    const column = (0, import_drizzle_orm3.getColumns)(table)[columnName];
    variants.push(extractFiltersColumn(column, columnName, operators));
  }
  return variants.length ? variants.length > 1 ? (0, import_drizzle_orm3.and)(...variants) : variants[0] : void 0;
};
var extractRelationsParamsInner = (relationMap, tables, tableName, typeName, originField, _isInitial = false) => {
  const relations = relationMap[tableName];
  if (!relations) {
    return void 0;
  }
  const baseField = Object.entries(originField.fieldsByTypeName).find(([key, _value]) => key === typeName)?.[1];
  if (!baseField) {
    return void 0;
  }
  const args = {};
  for (const [relName, { targetTableName }] of Object.entries(relations)) {
    const relTypeName = `${capitalize(tableName)}${capitalize(relName)}Relation`;
    const field = baseField[relName] ?? Object.values(baseField).find((f) => f.name === relName);
    if (!field) {
      continue;
    }
    const relField = field?.fieldsByTypeName;
    const relFieldSelection = relField?.[relTypeName];
    if (!relFieldSelection) {
      continue;
    }
    const columns = extractSelectedColumnsFromTree(relFieldSelection, tables[targetTableName]);
    const thisRecord = {};
    thisRecord.columns = columns;
    const relationField = Object.values(baseField).find((e) => e.name === relName);
    const relationArgs = relationField?.args;
    const offset = relationArgs?.offset ?? void 0;
    const limit = relationArgs?.limit ?? void 0;
    const relWhere = relationArgs?.where;
    thisRecord.where = relWhere ? { RAW: (aliasedTable) => extractFilters(aliasedTable, relName, relWhere) } : void 0;
    thisRecord.orderBy = relationArgs?.orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, relationArgs.orderBy) : void 0;
    thisRecord.offset = offset;
    thisRecord.limit = limit;
    const relWith = relationField ? extractRelationsParamsInner(relationMap, tables, targetTableName, relTypeName, relationField) : void 0;
    thisRecord.with = relWith;
    args[relName] = thisRecord;
  }
  return args;
};
var extractRelationsParams = (relationMap, tables, tableName, info, typeName) => {
  if (!info) {
    return void 0;
  }
  return extractRelationsParamsInner(relationMap, tables, tableName, typeName, info, true);
};

// src/util/builders/mysql.ts
var generateSelectArray = (db, tableName, tables, relationMap, orderArgs, filterArgs, listSuffix) => {
  const queryName = `${uncapitalize(tableName)}${listSuffix}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: import_graphql4.GraphQLInt
    },
    limit: {
      type: import_graphql4.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info.parseResolveInfo)(info, {
          deep: true
        });
        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0
        });
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle = (db, tableName, tables, relationMap, orderArgs, filterArgs, singleSuffix) => {
  const queryName = `${uncapitalize(tableName)}${singleSuffix}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: import_graphql4.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info.parseResolveInfo)(info, {
          deep: true
        });
        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0
        });
        const result = await query;
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const queryArgs = {
    values: {
      type: new import_graphql4.GraphQLNonNull(new import_graphql4.GraphQLList(new import_graphql4.GraphQLNonNull(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new import_graphql4.GraphQLError("No values were provided!");
        }
        await db.insert(table).values(input);
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const queryArgs = {
    values: {
      type: new import_graphql4.GraphQLNonNull(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        await db.insert(table).values(input);
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate = (db, tableName, table, setArgs, filterArgs) => {
  const queryName = `update${capitalize(tableName)}`;
  const queryArgs = {
    set: {
      type: new import_graphql4.GraphQLNonNull(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const { where, set } = args;
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new import_graphql4.GraphQLError("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        await query;
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete = (db, tableName, table, filterArgs) => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, _info) => {
      try {
        const { where } = args;
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        await query;
        return { isSuccess: true };
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql4.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var buildNamedRelations = (relations, tableEntries) => {
  const namedRelations = {};
  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) {
      continue;
    }
    const namedConfig = {};
    for (const [innerRelName, innerRelValue] of Object.entries(relConfig.relations)) {
      const targetTable = innerRelValue.targetTable ?? innerRelValue.referencedTable;
      const directTargetName = innerRelValue.targetTableName;
      let targetTableName;
      if (directTargetName) {
        const targetEntry = tableEntries.find(([key]) => key === directTargetName);
        targetTableName = targetEntry?.[0];
      } else if (targetTable) {
        const targetEntry = tableEntries.find(([, tableValue]) => tableValue === targetTable);
        targetTableName = targetEntry?.[0];
      }
      if (!targetTableName) {
        continue;
      }
      namedConfig[innerRelName] = {
        relation: innerRelValue,
        targetTableName
      };
    }
    if (Object.keys(namedConfig).length > 0) {
      namedRelations[relTableName] = namedConfig;
    }
  }
  return namedRelations;
};
var generateSchemaData = (db, schema, relations, relationsDepthLimit, _prefixes, suffixes) => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);
  const tableEntries = schemaEntries.filter(([_key, value]) => (0, import_drizzle_orm4.is)(value, import_mysql_core2.MySqlTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const namedRelations = buildNamedRelations(relations ?? {}, tableEntries);
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, _table]) => [
      tableName,
      generateTableTypes(tableName, tables, namedRelations, false, relationsDepthLimit, cacheCtx)
    ])
  );
  const mutationReturnType = new import_graphql4.GraphQLObjectType({
    name: "MutationReturn",
    fields: {
      isSuccess: {
        type: new import_graphql4.GraphQLNonNull(import_graphql4.GraphQLBoolean)
      }
    }
  });
  const inputs = {};
  const outputs = {
    MutationReturn: mutationReturnType
  };
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list
    );
    const selectSingleGenerated = generateSelectSingle(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single
    );
    const insertArrGenerated = generateInsertArray(db, tableName, schema[tableName], insertInput);
    const insertSingleGenerated = generateInsertSingle(db, tableName, schema[tableName], insertInput);
    const updateGenerated = generateUpdate(db, tableName, schema[tableName], updateInput, tableFilters);
    const deleteGenerated = generateDelete(db, tableName, schema[tableName], tableFilters);
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: mutationReturnType,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: mutationReturnType,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: mutationReturnType,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: mutationReturnType,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
  }
  return { queries, mutations, inputs, types: outputs };
};

// src/util/builders/pg.ts
var import_drizzle_orm5 = require("drizzle-orm");
var import_pg_core2 = require("drizzle-orm/pg-core");
var import_graphql5 = require("graphql");
var import_graphql_parse_resolve_info2 = require("graphql-parse-resolve-info");
var generateSelectArray2 = (db, tableName, tables, relationMap, orderArgs, filterArgs, listSuffix) => {
  const queryName = `${cleanTableName(tableName)}${listSuffix}`;
  const queryBase = db.query[tableName];
  const queryArgs = {
    offset: {
      type: import_graphql5.GraphQLInt
    },
    limit: {
      type: import_graphql5.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table);
        let result;
        if (queryBase) {
          const withParams = relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0;
          result = await queryBase.findMany({
            columns: selectedColumns,
            offset,
            limit,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
            with: withParams
          });
        } else {
          let q = db.select(selectedColumns).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where));
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy));
          }
          if (offset) {
            q = q.offset(offset);
          }
          if (limit) {
            q = q.limit(limit);
          }
          result = await q;
        }
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle2 = (db, tableName, tables, relationMap, orderArgs, filterArgs, singleSuffix) => {
  const queryName = `${cleanTableName(tableName)}${singleSuffix}`;
  const queryBase = db.query[tableName];
  const queryArgs = {
    offset: {
      type: import_graphql5.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const selectedColumns = extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table);
        let result;
        if (queryBase) {
          result = await queryBase.findFirst({
            columns: selectedColumns,
            offset,
            // drizzle-orm v1 RQB calls orderBy with the aliased table proxy (e.g.
            // d0, d1) — use it directly so column refs match the CTE alias.
            orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
            where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
            with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0
          });
        } else {
          let q = db.select(selectedColumns).from(table);
          if (where) {
            q = q.where(extractFilters(table, tableName, where));
          }
          if (orderBy) {
            q = q.orderBy(...extractOrderBy(table, orderBy));
          }
          if (offset) {
            q = q.offset(offset);
          }
          const rows = await q.limit(1);
          result = rows[0];
        }
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray2 = (db, tableName, table, baseType, prefix, conflictDoNothing = false) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    values: {
      type: new import_graphql5.GraphQLNonNull(new import_graphql5.GraphQLList(new import_graphql5.GraphQLNonNull(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new import_graphql5.GraphQLError("No values were provided!");
        }
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing();
        }
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle2 = (db, tableName, table, baseType, prefix, conflictDoNothing = false) => {
  const queryName = `${prefix}${capitalize(tableName)}Single`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    values: {
      type: new import_graphql5.GraphQLNonNull(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.insert(table).values(input).returning(columns);
        if (conflictDoNothing) {
          query = query.onConflictDoNothing();
        }
        const result = await query;
        if (!result[0]) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result[0], tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate2 = (db, tableName, table, setArgs, filterArgs, prefix) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    set: {
      type: new import_graphql5.GraphQLNonNull(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where, set } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new import_graphql5.GraphQLError("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete2 = (db, tableName, table, filterArgs, prefix) => {
  const queryName = `${prefix}${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info2.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql5.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
function generateSchemaData2(db, schema, relations, relationsDepthLimit, prefixes, suffixes, conflictDoNothing = false) {
  const schemaEntries = Object.entries(schema);
  const tableEntries = schemaEntries.filter(([_key, value]) => (0, import_drizzle_orm5.is)(value, import_pg_core2.PgTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, _table]) => [
      tableName,
      generateTableTypes(tableName, tables, relations, true, relationsDepthLimit, cacheCtx)
    ])
  );
  const inputs = {};
  const outputs = {};
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput, singleTableItemOutput, arrTableItemOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray2(
      db,
      tableName,
      tables,
      relations,
      tableOrder,
      tableFilters,
      suffixes.list
    );
    const selectSingleGenerated = generateSelectSingle2(
      db,
      tableName,
      tables,
      relations,
      tableOrder,
      tableFilters,
      suffixes.single
    );
    const insertArrGenerated = generateInsertArray2(
      db,
      tableName,
      schema[tableName],
      insertInput,
      prefixes.insert,
      conflictDoNothing
    );
    const insertSingleGenerated = generateInsertSingle2(
      db,
      tableName,
      schema[tableName],
      insertInput,
      prefixes.insert,
      conflictDoNothing
    );
    const updateGenerated = generateUpdate2(
      db,
      tableName,
      schema[tableName],
      updateInput,
      tableFilters,
      prefixes.update
    );
    const deleteGenerated = generateDelete2(db, tableName, schema[tableName], tableFilters, prefixes.delete);
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }
  return { queries, mutations, inputs, types: outputs };
}

// src/util/builders/sqlite.ts
var import_drizzle_orm6 = require("drizzle-orm");
var import_sqlite_core2 = require("drizzle-orm/sqlite-core");
var import_graphql6 = require("graphql");
var import_graphql_parse_resolve_info3 = require("graphql-parse-resolve-info");
var generateSelectArray3 = (db, tableName, tables, relationMap, orderArgs, filterArgs, _listSuffix) => {
  const queryName = `${uncapitalize(tableName)}`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: import_graphql6.GraphQLInt
    },
    limit: {
      type: import_graphql6.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, limit, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const query = queryBase.findMany({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          limit,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0
        });
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateSelectSingle3 = (db, tableName, tables, relationMap, orderArgs, filterArgs, _singleSuffix) => {
  const queryName = `${uncapitalize(tableName)}Single`;
  const queryBase = db.query[tableName];
  if (!queryBase) {
    throw new Error(
      `Drizzle-GraphQL Error: Table ${tableName} not found in drizzle instance. Did you forget to pass schema to drizzle constructor?`
    );
  }
  const queryArgs = {
    offset: {
      type: import_graphql6.GraphQLInt
    },
    orderBy: {
      type: orderArgs
    },
    where: {
      type: filterArgs
    }
  };
  const typeName = `${capitalize(tableName)}SelectItem`;
  const table = tables[tableName];
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { offset, orderBy, where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const query = queryBase.findFirst({
          columns: extractSelectedColumnsFromTree(parsedInfo.fieldsByTypeName[typeName], table),
          offset,
          // drizzle-orm v1 RQB calls orderBy with the aliased table proxy —
          // use it directly so column refs match the CTE alias.
          orderBy: orderBy ? (aliasedTable) => extractOrderBy(aliasedTable, orderBy) : void 0,
          where: where ? { RAW: (aliased) => extractFilters(aliased, tableName, where) } : void 0,
          with: relationMap[tableName] ? extractRelationsParams(relationMap, tables, tableName, parsedInfo, typeName) : void 0
        });
        const result = await query;
        if (!result) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result, tableName, table, relationMap);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertArray3 = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    values: {
      type: new import_graphql6.GraphQLNonNull(new import_graphql6.GraphQLList(new import_graphql6.GraphQLNonNull(baseType)))
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLArrayInput(args.values, table);
        if (!input.length) {
          throw new import_graphql6.GraphQLError("No values were provided!");
        }
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateInsertSingle3 = (db, tableName, table, baseType) => {
  const queryName = `insertInto${capitalize(tableName)}Single`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    values: {
      type: new import_graphql6.GraphQLNonNull(baseType)
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const input = remapFromGraphQLSingleInput(args.values, table);
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const result = await db.insert(table).values(input).returning(columns).onConflictDoNothing();
        if (!result[0]) {
          return void 0;
        }
        return remapToGraphQLSingleOutput(result[0], tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateUpdate3 = (db, tableName, table, setArgs, filterArgs) => {
  const queryName = `update${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    set: {
      type: new import_graphql6.GraphQLNonNull(setArgs)
    },
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where, set } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        const input = remapFromGraphQLSingleInput(set, table);
        if (!Object.keys(input).length) {
          throw new import_graphql6.GraphQLError("Unable to update with no values specified!");
        }
        let query = db.update(table).set(input);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var generateDelete3 = (db, tableName, table, filterArgs) => {
  const queryName = `deleteFrom${capitalize(tableName)}`;
  const typeName = `${capitalize(tableName)}Item`;
  const queryArgs = {
    where: {
      type: filterArgs
    }
  };
  return {
    name: queryName,
    resolver: async (_source, args, _context, info) => {
      try {
        const { where } = args;
        const parsedInfo = (0, import_graphql_parse_resolve_info3.parseResolveInfo)(info, {
          deep: true
        });
        const columns = extractSelectedColumnsFromTreeSQLFormat(
          parsedInfo.fieldsByTypeName[typeName],
          table
        );
        let query = db.delete(table);
        if (where) {
          const filters = extractFilters(table, tableName, where);
          query = query.where(filters);
        }
        query = query.returning(columns);
        const result = await query;
        return remapToGraphQLArrayOutput(result, tableName, table);
      } catch (e) {
        if (e instanceof Error) {
          throw new import_graphql6.GraphQLError(e.message);
        }
        throw e;
      }
    },
    args: queryArgs
  };
};
var buildNamedRelations2 = (relations, tableEntries) => {
  const namedRelations = {};
  for (const [relTableName, relConfig] of Object.entries(relations)) {
    if (!relConfig?.relations) {
      continue;
    }
    const namedConfig = {};
    for (const [innerRelName, innerRelValue] of Object.entries(relConfig.relations)) {
      const targetTable = innerRelValue.targetTable ?? innerRelValue.referencedTable;
      const directTargetName = innerRelValue.targetTableName;
      let targetTableName;
      if (directTargetName) {
        const targetEntry = tableEntries.find(([key]) => key === directTargetName);
        targetTableName = targetEntry?.[0];
      } else if (targetTable) {
        const targetEntry = tableEntries.find(([, tableValue]) => tableValue === targetTable);
        targetTableName = targetEntry?.[0];
      }
      if (!targetTableName) {
        continue;
      }
      namedConfig[innerRelName] = {
        relation: innerRelValue,
        targetTableName
      };
    }
    if (Object.keys(namedConfig).length > 0) {
      namedRelations[relTableName] = namedConfig;
    }
  }
  return namedRelations;
};
var generateSchemaData3 = (db, schema, relations, relationsDepthLimit, _prefixes, suffixes) => {
  const rawSchema = schema;
  const schemaEntries = Object.entries(rawSchema);
  const tableEntries = schemaEntries.filter(([_key, value]) => (0, import_drizzle_orm6.is)(value, import_sqlite_core2.SQLiteTable));
  const tables = Object.fromEntries(tableEntries);
  if (!tableEntries.length) {
    throw new Error(
      "Drizzle-GraphQL Error: No tables detected in Drizzle-ORM's database instance. Did you forget to pass schema to drizzle constructor?"
    );
  }
  const namedRelations = buildNamedRelations2(relations ?? {}, tableEntries);
  const cacheCtx = {
    genericFilterCache: /* @__PURE__ */ new Map(),
    objectTypeCache: /* @__PURE__ */ new Map(),
    relationTypeCache: /* @__PURE__ */ new Map()
  };
  const queries = {};
  const mutations = {};
  const gqlSchemaTypes = Object.fromEntries(
    Object.entries(tables).map(([tableName, _table]) => [
      tableName,
      generateTableTypes(tableName, tables, namedRelations, true, relationsDepthLimit, cacheCtx)
    ])
  );
  const inputs = {};
  const outputs = {};
  for (const [tableName, tableTypes] of Object.entries(gqlSchemaTypes)) {
    const { insertInput, updateInput, tableFilters, tableOrder } = tableTypes.inputs;
    const { selectSingleOutput, selectArrOutput, singleTableItemOutput, arrTableItemOutput } = tableTypes.outputs;
    const selectArrGenerated = generateSelectArray3(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.list
    );
    const selectSingleGenerated = generateSelectSingle3(
      db,
      tableName,
      tables,
      namedRelations,
      tableOrder,
      tableFilters,
      suffixes.single
    );
    const insertArrGenerated = generateInsertArray3(db, tableName, schema[tableName], insertInput);
    const insertSingleGenerated = generateInsertSingle3(db, tableName, schema[tableName], insertInput);
    const updateGenerated = generateUpdate3(db, tableName, schema[tableName], updateInput, tableFilters);
    const deleteGenerated = generateDelete3(db, tableName, schema[tableName], tableFilters);
    queries[selectArrGenerated.name] = {
      type: selectArrOutput,
      args: selectArrGenerated.args,
      resolve: selectArrGenerated.resolver
    };
    queries[selectSingleGenerated.name] = {
      type: selectSingleOutput,
      args: selectSingleGenerated.args,
      resolve: selectSingleGenerated.resolver
    };
    mutations[insertArrGenerated.name] = {
      type: arrTableItemOutput,
      args: insertArrGenerated.args,
      resolve: insertArrGenerated.resolver
    };
    mutations[insertSingleGenerated.name] = {
      type: singleTableItemOutput,
      args: insertSingleGenerated.args,
      resolve: insertSingleGenerated.resolver
    };
    mutations[updateGenerated.name] = {
      type: arrTableItemOutput,
      args: updateGenerated.args,
      resolve: updateGenerated.resolver
    };
    mutations[deleteGenerated.name] = {
      type: arrTableItemOutput,
      args: deleteGenerated.args,
      resolve: deleteGenerated.resolver
    };
    [insertInput, updateInput, tableFilters, tableOrder].forEach((e) => {
      inputs[e.name] = e;
    });
    outputs[selectSingleOutput.name] = selectSingleOutput;
    outputs[singleTableItemOutput.name] = singleTableItemOutput;
  }
  return { queries, mutations, inputs, types: outputs };
};

// src/index.ts
var buildSchema = (db, config) => {
  const schema = db._.fullSchema;
  const relations = db._.relations;
  if (!schema) {
    throw new Error(
      "Drizzle-GraphQL Error: Schema not found in drizzle instance. Make sure you're using drizzle-orm v0.30.9 or above and schema is passed to drizzle constructor!"
    );
  }
  const prefixes = {
    insert: config?.prefixes?.insert ?? "insertInto",
    delete: config?.prefixes?.delete ?? "deleteFrom",
    update: config?.prefixes?.update ?? "update"
  };
  const suffixes = {
    list: config?.suffixes?.list ?? "",
    single: config?.suffixes?.single ?? "Single"
  };
  if (typeof config?.relationsDepthLimit === "number") {
    if (config.relationsDepthLimit < 0) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!"
      );
    }
    if (config.relationsDepthLimit !== ~~config.relationsDepthLimit) {
      throw new Error(
        "Drizzle-GraphQL Error: config.relationsDepthLimit is supposed to be nonnegative integer or undefined!"
      );
    }
    if (suffixes.list === suffixes.single) {
      throw new Error(
        "Drizzle-GraphQL Error: List and single query suffixes cannot be the same. This would create conflicting GraphQL field names."
      );
    }
  }
  let generatorOutput;
  if ((0, import_drizzle_orm7.is)(db, import_mysql_core3.MySqlDatabase)) {
    generatorOutput = generateSchemaData(db, schema, relations, config?.relationsDepthLimit, prefixes, suffixes);
  } else if ((0, import_drizzle_orm7.is)(db, import_pg_core3.PgAsyncDatabase)) {
    generatorOutput = generateSchemaData2(
      db,
      schema,
      relations,
      config?.relationsDepthLimit,
      prefixes,
      suffixes,
      config?.conflictDoNothing ?? false
    );
  } else if ((0, import_drizzle_orm7.is)(db, import_sqlite_core3.BaseSQLiteDatabase)) {
    generatorOutput = generateSchemaData3(db, schema, relations, config?.relationsDepthLimit, prefixes, suffixes);
  } else {
    throw new Error("Drizzle-GraphQL Error: Unknown database instance type");
  }
  const { queries, mutations, inputs, types } = generatorOutput;
  const graphQLSchemaConfig = {
    types: [...Object.values(inputs), ...Object.values(types)],
    query: new import_graphql7.GraphQLObjectType({
      name: "Query",
      fields: queries
    })
  };
  if (config?.mutations !== false) {
    const mutation = new import_graphql7.GraphQLObjectType({
      name: "Mutation",
      fields: mutations
    });
    graphQLSchemaConfig.mutation = mutation;
  }
  const outputSchema = new import_graphql7.GraphQLSchema(graphQLSchemaConfig);
  return { schema: outputSchema, entities: generatorOutput };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildSchema
});
//# sourceMappingURL=index.cjs.map