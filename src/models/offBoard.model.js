const mongoose = require("mongoose");

const offBoardSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: { type: String, enum: ['draft', 'pendingApproval', 'approved', 'rejected', 'relieved', 'cancelled'], default: 'pendingApproval' },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    rejectionReason: String,
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    exitInformation: {
        exitType: { type: String },
        exitReason: { type: String },
        resignationSubmitionDate: { type: mongoose.Schema.Types.Mixed },
        lastWorkingDate: { type: mongoose.Schema.Types.Mixed },
        noticePeriod: { type: mongoose.Schema.Types.Mixed },
        actualNoticePeriod: { type: mongoose.Schema.Types.Mixed },
        waiver: { type: Boolean, default: false },
        exitApprovedBy: { type: mongoose.Schema.Types.Mixed },
        approvalDate: { type: mongoose.Schema.Types.Mixed },
    },

    finalSettlemelastMonthSalary: {
        lastMonthSalary: { type: Boolean, default: false },
        pendingSalary: { type: Boolean, default: false },
        leaveEncashment: { type: Boolean, default: false },
        bonus_incentives: { type: Boolean, default: false },
        reimbursements: { type: Boolean, default: false },
        noticePay: { type: Boolean, default: false },
        assetDamge: { type: Boolean, default: false },
        loanRecovery: { type: Boolean, default: false },
        advanceSalary: { type: Boolean, default: false },
        taxAdjustments: { type: Boolean, default: false },
        tenth_marksheet: { type: Boolean, default: false },
        twelevth_marksheet: { type: Boolean, default: false },
    },

    userDocuments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "UserDocument"
    }],

    isEmailVerified: { type: Boolean, default: false },
    verificationEmail: { type: String },
}, { timestamps: true });

const offBoard = mongoose.model("OffBoard", offBoardSchema);
module.exports = offBoard;
