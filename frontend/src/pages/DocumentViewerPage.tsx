import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../components/Toast';
import { Download, ArrowLeft, Mail, Send } from 'lucide-react';
import { Document } from '../types/document';
import SVGPreview from '../components/SVGPreview';

interface DocumentViewerPageProps {
  public?: boolean;
}

export default function DocumentViewerPage({ public: isPublic = false }: DocumentViewerPageProps) {
  const { id, token } = useParams<{ id?: string; token?: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const endpoint = isPublic && token 
          ? `/documents/public/${token}` 
          : `/documents/${id}`;
        
        const response = await api.get(endpoint);
        setDocument(response.data.data.document);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to load document');
        if (!isPublic) {
          navigate('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    if (id || token) {
      fetchDocument();
    }
  }, [id, token, isPublic, navigate]);

  const handleDownloadPDF = async () => {
    if (!document) return;

    try {
      setDownloadingPDF(true);
      const response = await api.get(`/documents/${document.id}/pdf`, {
        responseType: 'blob',
      });

      // Create blob and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${document.documentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    if (!document || !emailAddress) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSendingEmail(true);
      await api.post(`/documents/${document.id}/send`, {
        email: emailAddress,
        message: emailMessage,
      });

      toast.success('Document sent successfully!');
      setShowEmailModal(false);
      setEmailAddress('');
      setEmailMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Document not found</p>
          {!isPublic && (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    );
  }

  const documentData = document.data;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">{document.title}</h1>
          <p className="text-gray-600 mt-2">
            {document.documentNumber} • {document.type} • {document.status}
          </p>
        </div>
        <div className="flex gap-2">
          {!isPublic && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Email
            </button>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {downloadingPDF ? 'Downloading...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
        {/* Document Info */}
        <div className="grid grid-cols-2 gap-8 border-b pb-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">From</h3>
            {documentData.companyInfo ? (
              <div>
                <p className="font-medium">{documentData.companyInfo.name}</p>
                {documentData.companyInfo.address && <p>{documentData.companyInfo.address}</p>}
                {documentData.companyInfo.city && (
                  <p>{[documentData.companyInfo.postalCode, documentData.companyInfo.city].filter(Boolean).join(' ')}</p>
                )}
                {documentData.companyInfo.country && <p>{documentData.companyInfo.country}</p>}
                {documentData.companyInfo.vatNumber && <p className="mt-2">VAT: {documentData.companyInfo.vatNumber}</p>}
              </div>
            ) : (
              <p className="text-gray-500">Company information not available</p>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">To</h3>
            {documentData.clientInfo ? (
              <div>
                <p className="font-medium">{documentData.clientInfo.name}</p>
                {documentData.clientInfo.address && <p>{documentData.clientInfo.address}</p>}
                {documentData.clientInfo.city && (
                  <p>{[documentData.clientInfo.postalCode, documentData.clientInfo.city].filter(Boolean).join(' ')}</p>
                )}
                {documentData.clientInfo.country && <p>{documentData.clientInfo.country}</p>}
                {documentData.clientInfo.vatNumber && <p className="mt-2">VAT: {documentData.clientInfo.vatNumber}</p>}
              </div>
            ) : (
              <p className="text-gray-500">Client information not available</p>
            )}
          </div>
        </div>

        {/* Description */}
        {documentData.description && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
            <p className="text-gray-600">{documentData.description}</p>
          </div>
        )}

        {/* Line Items */}
        {documentData.lineItems && documentData.lineItems.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">Unit Price</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {documentData.lineItems.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.description}</td>
                      <td className="text-right py-2">{item.quantity}</td>
                      <td className="text-right py-2">{document.currency} {item.unitPrice.toFixed(2)}</td>
                      <td className="text-right py-2">{document.currency} {(item.total || item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Technical Specifications */}
        {(document.hasWindows || document.hasDoors || document.hasShutters) && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-4">Technical Specifications</h3>
            <SVGPreview
              windows={documentData.windows || []}
              doors={documentData.doors || []}
              shutters={documentData.shutters || []}
              scale={0.15}
            />
          </div>
        )}

        {/* Totals */}
        <div className="border-t pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{document.currency} {document.subtotal.toFixed(2)}</span>
              </div>
              {document.vatRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">VAT ({document.vatRate}%):</span>
                  <span className="font-medium">{document.currency} {document.vatAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total:</span>
                <span>{document.currency} {document.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        {documentData.paymentTerms && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Payment Terms</h3>
            <p className="text-gray-600">{documentData.paymentTerms}</p>
          </div>
        )}

        {/* Notes */}
        {documentData.notes && (
          <div>
            <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{documentData.notes}</p>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Send Document via Email</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="client@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Message (Optional)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Add a personal message..."
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailAddress('');
                    setEmailMessage('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail || !emailAddress}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
