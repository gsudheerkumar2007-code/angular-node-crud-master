const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');

const ClientSchema = new mongoose.Schema({
	code: {
		type: Number,
		required: true,
	},
	name: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	phone: {
		type: String,
		required: false,
		trim: true
	},
	address: {
		type: String,
		required: false
	},
	telephone: {
		type: String,
		required: false
    },
    status: {
        type: String,
        required: true,
        default: 'active'
	},
	birthDate: {
		type: Date,
		required: false
	}
}, {
	timestamps: true
});

// Add indexes for better performance
ClientSchema.index({ email: 1 }, { unique: true });
ClientSchema.index({ name: 1 });
ClientSchema.index({ status: 1 });
ClientSchema.index({ code: 1 }, { unique: true });
ClientSchema.index({ createdAt: 1 });
ClientSchema.index({ updatedAt: 1 });

// Compound indexes for common queries
ClientSchema.index({ status: 1, createdAt: -1 });
ClientSchema.index({ name: 1, email: 1 });

ClientSchema.plugin(mongoosePaginate);
mongoose.model('Client', ClientSchema);
