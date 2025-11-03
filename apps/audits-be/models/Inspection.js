import mongoose from 'mongoose';

const InspectionSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
        required: true
    },
    inspectorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    performedAt: {
        type: Date,
        default: Date.now
    },
    // Free text summary that does not affect scoring
    summaryText: {
        type: String,
        default: ''
    },
    finalScore: {
        type: Number
    },
    sectionScores: [{
        sectionName: { type: String, required: true },
        score: { type: Number, required: true, default: 0 }
    }],
    answers: [{
        questionId: {
            type: String,
            required: true
        },
        value: {
            type: mongoose.Schema.Types.Mixed
        },
        comment: {
            type: String
        },
        photos: [{
            type: String
        }],
        calculatedScore: {
            type: Number
        }
    }],
    // *** START: NEW FIELDS FOR SHARING ***
    shareableToken: {
      type: String,
      unique: true,
      sparse: true // Allows multiple documents to have a null value for this field
    },
    shareableTokenExpires: {
      type: Date
    },
    // *** END: NEW FIELDS FOR SHARING ***
}, { timestamps: true });

export default mongoose.model('Inspection', InspectionSchema);