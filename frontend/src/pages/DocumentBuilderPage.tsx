import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../lib/api';
import { toast } from '../components/Toast';
import { Plus, Trash2, Save, Eye } from 'lucide-react';
import { DocumentData, WindowSpec, DoorSpec, ShutterSpec, DocumentLineItem } from '../types/document';
import SVGPreview from '../components/SVGPreview';

const documentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['INVOICE', 'QUOTE', 'PROFORMA']),
  clientId: z.string().uuid().optional(),
  description: z.string().optional(),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  hasWindows: z.boolean().default(false),
  hasDoors: z.boolean().default(false),
  hasShutters: z.boolean().default(false),
  lineItems: z.array(z.object({
    id: z.string(),
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    total: z.number().nonnegative(),
    vatRate: z.number().min(0).max(100).optional(),
  })),
  windows: z.array(z.any()).optional(),
  doors: z.array(z.any()).optional(),
  shutters: z.array(z.any()).optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

export default function DocumentBuilderPage() {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      type: 'INVOICE',
      issueDate: new Date().toISOString().split('T')[0],
      hasWindows: false,
      hasDoors: false,
      hasShutters: false,
      lineItems: [],
    },
  });

  // Watch line items to calculate totals
  const lineItems = watch('lineItems');
  
  // Calculate line item totals when quantity or unitPrice changes
  const updateLineItemTotal = (index: number) => {
    const item = lineItems[index];
    if (item) {
      const total = (item.quantity || 0) * (item.unitPrice || 0);
      setValue(`lineItems.${index}.total`, total);
    }
  };

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control,
    name: 'lineItems',
  });

  const { fields: windowFields, append: appendWindow, remove: removeWindow } = useFieldArray({
    control,
    name: 'windows',
  });

  const { fields: doorFields, append: appendDoor, remove: removeDoor } = useFieldArray({
    control,
    name: 'doors',
  });

  const { fields: shutterFields, append: appendShutter, remove: removeShutter } = useFieldArray({
    control,
    name: 'shutters',
  });

  const hasWindows = watch('hasWindows');
  const hasDoors = watch('hasDoors');
  const hasShutters = watch('hasShutters');

  const onSubmit = async (data: DocumentFormData) => {
    setIsSaving(true);
    try {
      const documentData: DocumentData = {
        title: data.title,
        description: data.description,
        issueDate: data.issueDate,
        dueDate: data.dueDate,
        paymentTerms: data.paymentTerms,
        notes: data.notes,
        lineItems: data.lineItems,
        windows: hasWindows && data.windows ? data.windows : undefined,
        doors: hasDoors && data.doors ? data.doors : undefined,
        shutters: hasShutters && data.shutters ? data.shutters : undefined,
      };

      const response = await api.post('/documents', {
        title: data.title,
        type: data.type,
        clientId: data.clientId,
        data: documentData,
        hasWindows: hasWindows && windowFields.length > 0,
        hasDoors: hasDoors && doorFields.length > 0,
        hasShutters: hasShutters && shutterFields.length > 0,
      });

      toast.success('Document created successfully!');
      navigate(`/documents/${response.data.data.document.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create document');
    } finally {
      setIsSaving(false);
    }
  };

  const addLineItem = () => {
    appendLineItem({
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      vatRate: 0,
    });
  };

  const addWindow = () => {
    appendWindow({
      id: crypto.randomUUID(),
      type: 'double',
      width: 1000,
      height: 1200,
      frameMaterial: 'aluminum',
      glassType: 'double',
      quantity: 1,
      unitPrice: 0,
    });
  };

  const addDoor = () => {
    appendDoor({
      id: crypto.randomUUID(),
      type: 'entrance',
      width: 900,
      height: 2100,
      frameMaterial: 'aluminum',
      doorMaterial: 'composite',
      openingDirection: 'left',
      hasGlass: false,
      quantity: 1,
      unitPrice: 0,
    });
  };

  const addShutter = () => {
    appendShutter({
      id: crypto.randomUUID(),
      type: 'rolling',
      width: 1000,
      height: 1200,
      material: 'aluminum',
      operation: 'manual',
      quantity: 1,
      unitPrice: 0,
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Create Document</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type *
              </label>
              <select {...register('type')} className="w-full px-3 py-2 border rounded-lg">
                <option value="INVOICE">Invoice</option>
                <option value="QUOTE">Quote</option>
                <option value="PROFORMA">Proforma</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                {...register('title')}
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Invoice #12345"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date *
              </label>
              <input
                {...register('issueDate')}
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Document description..."
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms
              </label>
              <input
                {...register('paymentTerms')}
                type="text"
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Net 30 days"
              />
            </div>
          </div>
        </div>

        {/* Technical Specifications Toggle */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Technical Specifications</h2>
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('hasWindows')}
                className="w-4 h-4"
              />
              <span>Include Windows</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('hasDoors')}
                className="w-4 h-4"
              />
              <span>Include Doors</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('hasShutters')}
                className="w-4 h-4"
              />
              <span>Include Shutters</span>
            </label>
          </div>

          {/* Windows Section */}
          {hasWindows && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Windows</h3>
                <button
                  type="button"
                  onClick={addWindow}
                  className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Window
                </button>
              </div>
              {windowFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Window {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeWindow(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Type</label>
                      <select {...register(`windows.${index}.type`)} className="w-full px-2 py-1 border rounded">
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="triple">Triple</option>
                        <option value="sliding">Sliding</option>
                        <option value="casement">Casement</option>
                        <option value="tilt-turn">Tilt & Turn</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Width (mm)</label>
                      <input
                        type="number"
                        {...register(`windows.${index}.width`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        {...register(`windows.${index}.height`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Frame Material</label>
                      <select {...register(`windows.${index}.frameMaterial`)} className="w-full px-2 py-1 border rounded">
                        <option value="aluminum">Aluminum</option>
                        <option value="wood">Wood</option>
                        <option value="pvc">PVC</option>
                        <option value="composite">Composite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Glass Type</label>
                      <select {...register(`windows.${index}.glassType`)} className="w-full px-2 py-1 border rounded">
                        <option value="single">Single</option>
                        <option value="double">Double</option>
                        <option value="triple">Triple</option>
                        <option value="laminated">Laminated</option>
                        <option value="tempered">Tempered</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        {...register(`windows.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Unit Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`windows.${index}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Color</label>
                      <input
                        type="text"
                        {...register(`windows.${index}.color`)}
                        className="w-full px-2 py-1 border rounded"
                        placeholder="White"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Doors Section */}
          {hasDoors && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Doors</h3>
                <button
                  type="button"
                  onClick={addDoor}
                  className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Door
                </button>
              </div>
              {doorFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Door {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeDoor(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Type</label>
                      <select {...register(`doors.${index}.type`)} className="w-full px-2 py-1 border rounded">
                        <option value="entrance">Entrance</option>
                        <option value="interior">Interior</option>
                        <option value="sliding">Sliding</option>
                        <option value="folding">Folding</option>
                        <option value="revolving">Revolving</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Width (mm)</label>
                      <input
                        type="number"
                        {...register(`doors.${index}.width`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        {...register(`doors.${index}.height`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Frame Material</label>
                      <select {...register(`doors.${index}.frameMaterial`)} className="w-full px-2 py-1 border rounded">
                        <option value="aluminum">Aluminum</option>
                        <option value="wood">Wood</option>
                        <option value="steel">Steel</option>
                        <option value="composite">Composite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Door Material</label>
                      <select {...register(`doors.${index}.doorMaterial`)} className="w-full px-2 py-1 border rounded">
                        <option value="wood">Wood</option>
                        <option value="glass">Glass</option>
                        <option value="metal">Metal</option>
                        <option value="composite">Composite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Opening Direction</label>
                      <select {...register(`doors.${index}.openingDirection`)} className="w-full px-2 py-1 border rounded">
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                        <option value="both">Both</option>
                        <option value="sliding">Sliding</option>
                      </select>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          {...register(`doors.${index}.hasGlass`)}
                          className="w-4 h-4"
                        />
                        Has Glass
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        {...register(`doors.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Unit Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`doors.${index}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Shutters Section */}
          {hasShutters && (
            <div className="mt-4 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Shutters</h3>
                <button
                  type="button"
                  onClick={addShutter}
                  className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Shutter
                </button>
              </div>
              {shutterFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Shutter {index + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeShutter(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Type</label>
                      <select {...register(`shutters.${index}.type`)} className="w-full px-2 py-1 border rounded">
                        <option value="rolling">Rolling</option>
                        <option value="panel">Panel</option>
                        <option value="bahama">Bahama</option>
                        <option value="plantation">Plantation</option>
                        <option value="roman">Roman</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Width (mm)</label>
                      <input
                        type="number"
                        {...register(`shutters.${index}.width`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Height (mm)</label>
                      <input
                        type="number"
                        {...register(`shutters.${index}.height`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Material</label>
                      <select {...register(`shutters.${index}.material`)} className="w-full px-2 py-1 border rounded">
                        <option value="aluminum">Aluminum</option>
                        <option value="wood">Wood</option>
                        <option value="pvc">PVC</option>
                        <option value="composite">Composite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Operation</label>
                      <select {...register(`shutters.${index}.operation`)} className="w-full px-2 py-1 border rounded">
                        <option value="manual">Manual</option>
                        <option value="motorized">Motorized</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        {...register(`shutters.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Unit Price (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`shutters.${index}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2 py-1 border rounded"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Line Items</h2>
            <button
              type="button"
              onClick={addLineItem}
              className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          <div className="space-y-4">
            {lineItemFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-7 gap-4 items-end border-b pb-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <input
                    type="text"
                    {...register(`lineItems.${index}.description`)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Item description"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.quantity`, { 
                      valueAsNumber: true,
                      onChange: () => updateLineItemTotal(index),
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Unit Price (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.unitPrice`, { 
                      valueAsNumber: true,
                      onChange: () => updateLineItemTotal(index),
                    })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Total (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register(`lineItems.${index}.total`, { valueAsNumber: true })}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => removeLineItem(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {lineItemFields.length === 0 && (
              <p className="text-gray-500 text-center py-8">No line items added yet</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Additional Notes</h2>
          <textarea
            {...register('notes')}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="Additional notes or terms..."
          />
        </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Document'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Sidebar */}
        {showPreview && (
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <SVGPreview
                windows={hasWindows ? (watchedWindows || []) : []}
                doors={hasDoors ? (watchedDoors || []) : []}
                shutters={hasShutters ? (watchedShutters || []) : []}
                scale={0.1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
