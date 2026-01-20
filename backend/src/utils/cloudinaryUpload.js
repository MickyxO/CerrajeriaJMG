const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

function uploadBufferToCloudinary(buffer, { folder, publicId, resourceType } = {}) {
	if (!isCloudinaryConfigured) {
		throw new Error("Cloudinary no está configurado (faltan variables de entorno).");
	}

	if (!buffer || !Buffer.isBuffer(buffer)) {
		throw new Error("Buffer de archivo inválido.");
	}

	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder,
				public_id: publicId,
				resource_type: resourceType || "image",
			},
			(error, result) => {
				if (error) return reject(error);
				resolve(result);
			}
		);

		uploadStream.end(buffer);
	});
}

module.exports = {
	uploadBufferToCloudinary,
};
