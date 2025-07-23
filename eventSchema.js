const { Schema, model } = require("mongoose");

const eventsSchema = new Schema({
    uuid: { type: String, required: true },
    userId: { type: String, required: true },
    messageId: { type: String, required: true },
    unix: { type: String, required: true }
});

module.exports = model("Events", eventsSchema);
