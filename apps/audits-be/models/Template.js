import mongoose from 'mongoose';

const TemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    // הוספנו את השדה הזה כדי לשמור את רשימת החנויות המשויכות
    associatedStores: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store'
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    sections: [{
        title: {
            type: String,
            required: true
        },
        weight: {
            type: Number,
            default: 1
        },
        questions: [{
            type: {
                type: String,
                required: true,
                enum: ['yes_no', 'multiple_choice', 'slider', 'title', 'text_input', 'conditional']
            },
            text: {
                type: String,
                required: true
            },
            weight: {
                type: Number,
                default: 1
            },
            options: [{
                text: String,
                scoreWeight: {
                    type: Number,
                    default: 1
                }
            }],
            conditionalOn: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Question'
            },
            conditionalValue: {
                type: String
            },
            sliderRange: {
                type: [Number],
                default: [1, 10]
            },
            allowComment: {
                type: Boolean,
                default: true
            },
            allowPhoto: {
                type: Boolean,
                default: true
            },
            isFilterQuestion: {
                type: Boolean,
                default: false
            },
            conditionalTrigger: {
                onAnswer: {
                    type: String
                },
                followUpQuestions: [{
                    type: {
                        type: String,
                        enum: ['yes_no', 'multiple_choice', 'slider', 'text_input']
                    },
                    text: {
                        type: String
                    },
                    weight: {
                        type: Number,
                        default: 1
                    },
                    options: [{
                        text: String,
                        weight: {
                            type: Number,
                            default: 1
                        }
                    }],
                    sliderRange: {
                        type: [Number],
                        default: [1, 10]
                    },
                    allowComment: {
                        type: Boolean,
                        default: true
                    },
                    allowPhoto: {
                        type: Boolean,
                        default: true
                    },
                    isFilterQuestion: {
                        type: Boolean,
                        default: false
                    }
                }]
            }
        }]
    }]
}, { timestamps: true });

export default mongoose.model('Template', TemplateSchema);