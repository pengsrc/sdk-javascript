const Constants  = require("./constants.js");
const Commons    = require("./commons.js");
const Cloudevent = require("../../cloudevent.js");
const Spec02     = require("../../specs/spec_0_2.js");

var JSONParser = require("../../formats/json/parser.js");

const {
  isDefinedOrThrow,
  isStringOrObjectOrThrow
} = require("../../utils/fun.js");

const spec02 = new Spec02();
const jsonParserSpec02 = new JSONParser();

const parserByMime = {};
parserByMime[Constants.MIME_JSON]    = jsonParserSpec02;
parserByMime[Constants.MIME_CE_JSON] = jsonParserSpec02;

const allowedContentTypes = [];
allowedContentTypes.push(Constants.MIME_CE_JSON);

const setterByAttribute = {};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.TYPE] = {
  name : "type",
  parser : (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.SPEC_VERSION] = {
  name : "specversion",
  parser : (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.SOURCE] = {
  name : "source",
  parser: (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.ID] = {
  name : "id",
  parser : (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.TIME] = {
  name : "time",
  parser : (v) => new Date(Date.parse(v))
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.SCHEMA_URL] = {
  name: "schemaurl",
  parser: (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.CONTENT_TYPE] = {
  name: "contenttype",
  parser: (v) => v
};
setterByAttribute[Constants.STRUCTURED_ATTRS_02.DATA] = {
  name: "data",
  parser: (v) => v
};

function validateArgs(payload, attributes) {

  Array.of(payload)
    .filter((p) => isDefinedOrThrow(p,
              {message: "payload is null or undefined"}))
    .filter((p) => isStringOrObjectOrThrow(p,
              {message: "payload must be an object or string"}))
    .shift();

  Array.of(attributes)
    .filter((a) => isDefinedOrThrow(a,
                {message: "attributes is null or undefined"}))
    .shift();
}

function Receiver(configuration) {

}

Receiver.prototype.check = function(payload, headers) {
  validateArgs(payload, headers);

  var sanityHeaders = Commons.sanityAndClone(headers);

  // Validation Level 1
  if(!allowedContentTypes
      .includes(sanityHeaders[Constants.HEADER_CONTENT_TYPE])){
        throw {
          message: "invalid content type",
          errors: [sanityHeaders[Constants.HEADER_CONTENT_TYPE]]
        };
  }

  // No erros! Its contains the minimum required attributes
};

Receiver.prototype.parse = function(payload, headers) {
  this.check(payload, headers);

  var sanityHeaders = Commons.sanityAndClone(headers);

  var contentType = sanityHeaders[Constants.HEADER_CONTENT_TYPE];

  var parser = parserByMime[contentType];
  var event  = parser.parse(payload);
  spec02.check(event);

  var processedAttributes = [];
  var cloudevent = new Cloudevent(Spec02);

  Array.from(Object.keys(setterByAttribute))
    .forEach((attribute) => {
      var setterName = setterByAttribute[attribute].name;
      var parserFun   = setterByAttribute[attribute].parser;

      // invoke the setter function
      cloudevent[setterName](parserFun(event[attribute]));

      // to use ahead, for extensions processing
      processedAttributes.push(attribute);
    });

  // Every unprocessed attribute should be an extension
  Array.from(Object.keys(event))
    .filter((attribute) => !processedAttributes.includes(attribute))
    .forEach((extension) =>
      cloudevent.addExtension(extension, event[extension])
    );

  return cloudevent;
};

module.exports = Receiver;
