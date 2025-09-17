const mongoose = require('mongoose');

const Client = mongoose.model('Client');

module.exports = {
	async index(req, res) {
		try {
			const { page = 1, limit = 10 } = req.query;
			const pageNum = parseInt(page, 10);
			const limitNum = parseInt(limit, 10);

			// Validate pagination parameters
			if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
				return res.status(400).json({
					error: 'Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 100'
				});
			}

			const skip = (pageNum - 1) * limitNum;
			const clients = await Client.find()
				.skip(skip)
				.limit(limitNum)
				.sort({ createdAt: -1 });

			const total = await Client.countDocuments();

			return res.json({
				data: clients,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total,
					pages: Math.ceil(total / limitNum)
				}
			});
		} catch (err) {
			console.error('Error fetching clients:', err);
			return res.status(500).json({
				error: 'Failed to fetch clients',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		}
	},

	async show(req, res) {
		try {
			const client = await Client.findById(req.params.id);
			if (!client) {
				return res.status(404).json({
					error: 'Client not found'
				});
			}
			return res.json(client);
		} catch (err) {
			console.error('Error fetching client:', err);
			if (err.name === 'CastError') {
				return res.status(400).json({
					error: 'Invalid client ID format'
				});
			}
			return res.status(500).json({
				error: 'Failed to fetch client',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		}
	},

	async store(req, res) {
		try {
			// Check for duplicate email
			const existingClient = await Client.findOne({ email: req.body.email });
			if (existingClient) {
				return res.status(409).json({
					error: 'Client with this email already exists'
				});
			}

			const client = await Client.create(req.body);
			return res.status(201).json(client);
		} catch(err) {
			console.error('Error creating client:', err);
			if (err.name === 'ValidationError') {
				const errors = Object.values(err.errors).map(error => ({
					field: error.path,
					message: error.message
				}));
				return res.status(400).json({
					error: 'Validation failed',
					details: errors
				});
			}
			return res.status(500).json({
				error: 'Failed to create client',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		}
	},

	async update(req, res) {
		try {
			// Check for duplicate email (excluding current client)
			if (req.body.email) {
				const existingClient = await Client.findOne({
					email: req.body.email,
					_id: { $ne: req.params.id }
				});
				if (existingClient) {
					return res.status(409).json({
						error: 'Client with this email already exists'
					});
				}
			}

			const client = await Client.findByIdAndUpdate(
				req.params.id,
				req.body,
				{ new: true, runValidators: true }
			);

			if (!client) {
				return res.status(404).json({
					error: 'Client not found'
				});
			}

			return res.json(client);
		} catch (err) {
			console.error('Error updating client:', err);
			if (err.name === 'ValidationError') {
				const errors = Object.values(err.errors).map(error => ({
					field: error.path,
					message: error.message
				}));
				return res.status(400).json({
					error: 'Validation failed',
					details: errors
				});
			}
			if (err.name === 'CastError') {
				return res.status(400).json({
					error: 'Invalid client ID format'
				});
			}
			return res.status(500).json({
				error: 'Failed to update client',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		}
	},

	async destroy(req, res) {
		try {
			const client = await Client.findByIdAndDelete(req.params.id);
			if (!client) {
				return res.status(404).json({
					error: 'Client not found'
				});
			}
			return res.json({
				message: 'Client deleted successfully'
			});
		} catch (err) {
			console.error('Error deleting client:', err);
			if (err.name === 'CastError') {
				return res.status(400).json({
					error: 'Invalid client ID format'
				});
			}
			return res.status(500).json({
				error: 'Failed to delete client',
				message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
			});
		}
	}
};
