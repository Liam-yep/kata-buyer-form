import React, { useState, useEffect } from "react";
import "@vibe/core/tokens";
import "./BuyerForm.css";
import { Button, Loader, TextField, Dropdown, Box, Flex, Icon } from "@vibe/core";
import { Check, Add } from "@vibe/icons";
import MondayService from "../../services/MondayService";
import { useMonday } from "../../context/MondayContext";

const Context = {
    MarginBottom: 24,
    InputGap: 16
}

const BuyerForm = () => {
    const { monday, projects } = useMonday();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Data Options
    const [buildings, setBuildings] = useState([]);
    const [apartments, setApartments] = useState([]);
    const [storages, setStorages] = useState([]);
    const [parkings, setParkings] = useState([]);
    const [commercials, setCommercials] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        projectId: null,
        buildingId: null,
        apartmentId: null,
        storageId: null,
        parkingId: null,
        commercialId: null,
        // Buyers array - start with 2 empty rows
        buyers: [
            { fullName: "", phone: "", email: "", idNumber: "" },
            { fullName: "", phone: "", email: "", idNumber: "" }
        ]
    });

    useEffect(() => {
        // Init loader handling
        setTimeout(() => setLoading(false), 1000);
    }, [projects]);

    const handleProjectChange = async (option) => {
        if (!option) {
            setFormData(prev => ({
                ...prev,
                projectId: null,
                buildingId: null,
                apartmentId: null,
                storageId: null,
                parkingId: null,
                commercialId: null
            }));
            setBuildings([]);
            setStorages([]);
            setParkings([]);
            setCommercials([]);
            return;
        }

        setFormData(prev => ({ ...prev, projectId: option.value, buildingId: null, apartmentId: null }));
        setLoading(true);

        try {
            const details = await MondayService.getProjectDetails(option.value);
            if (details) {
                const [builds, stors, parks, comms] = await Promise.all([
                    MondayService.getItemsNames(details.buildingIds),
                    MondayService.getItemsNames(details.storageIds),
                    MondayService.getItemsNames(details.parkingIds),
                    MondayService.getItemsNames(details.commercialIds)
                ]);

                setBuildings(builds.map(i => ({ label: i.name, value: i.id })));
                setStorages(stors.map(i => ({ label: i.name, value: i.id })));
                setParkings(parks.map(i => ({ label: i.name, value: i.id })));
                setCommercials(comms.map(i => ({ label: i.name, value: i.id })));
            }
        } catch (e) {
            console.error("Failed to load project details", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuildingChange = async (option) => {
        if (!option) {
            setFormData(prev => ({ ...prev, buildingId: null, apartmentId: null }));
            setApartments([]);
            return;
        }

        setFormData(prev => ({ ...prev, buildingId: option.value, apartmentId: null }));
        setLoading(true);

        try {
            const apts = await MondayService.getApartmentOptions(option.value);
            setApartments(apts.map(a => ({ label: a.label, value: a.id })));
        } catch (e) {
            console.error("Failed to load apartments", e);
        } finally {
            setLoading(false);
        }
    };

    const handleBuyerChange = (index, field, value) => {
        const newBuyers = [...formData.buyers];
        newBuyers[index][field] = value;
        setFormData({ ...formData, buyers: newBuyers });
    };

    const addBuyerRow = () => {
        setFormData({
            ...formData,
            buyers: [...formData.buyers, { fullName: "", phone: "", email: "", idNumber: "" }]
        });
    };

    const handleSubmit = async () => {
        // Validation: required fields + at least first buyer name and ID
        const firstBuyer = formData.buyers[0];
        if (!firstBuyer.fullName || !firstBuyer.idNumber || !formData.projectId || !formData.buildingId || !formData.apartmentId) {
            monday.execute("notice", {
                message: "Please fill in all required fields (Project, Building, Apartment, Buyer Name, and ID)",
                type: "error",
                timeout: 3000
            });
            return;
        }

        // Check for partial rows
        const buyersValidation = formData.buyers.map((b, index) => {
            const hasData = b.fullName || b.idNumber || b.phone || b.email;
            const isComplete = b.fullName && b.idNumber;
            if (hasData && !isComplete) {
                return { valid: false, index };
            }
            return { valid: true, hasData };
        });

        const invalidRow = buyersValidation.find(v => !v.valid);
        if (invalidRow) {
            monday.execute("notice", {
                message: `Please fill in Name and ID for Buyer #${invalidRow.index + 1}`,
                type: "error",
                timeout: 3000
            });
            return;
        }

        setSubmitting(true);
        try {
            // Filter out empty buyers before sending (only send rows that have content)
            const validBuyers = formData.buyers.filter(b => b.fullName || b.idNumber || b.phone || b.email);

            const submissionData = { ...formData, buyers: validBuyers };

            // 1. Create Buyers first to get their IDs
            const createdBuyerIds = await MondayService.createBuyerRecord(submissionData);

            // 2. Create Communication linked to those buyers
            await MondayService.createBuyerCommunication(submissionData, createdBuyerIds);
            setSuccess(true);
        } catch (e) {
            console.error("Submission failed", e);
            monday.execute("notice", {
                message: "Failed to submit form. Please try again.",
                type: "error"
            });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSuccess(false);
        setFormData({
            projectId: null,
            buildingId: null,
            apartmentId: null,
            storageId: null,
            parkingId: null,
            commercialId: null,
            buyers: [
                { fullName: "", phone: "", email: "", idNumber: "" },
                { fullName: "", phone: "", email: "", idNumber: "" }
            ]
        });
        setBuildings([]);
        setApartments([]);
        setStorages([]);
        setParkings([]);
        setCommercials([]);
    };

    if (success) {
        return (
            <div className="buyer-form-card success-message">
                <Icon icon={Check} iconSize={64} style={{ color: "var(--positive-color)" }} />
                <h2>הטופס נשלח בהצלחה</h2>
                <Button onClick={resetForm}>הזנת טופס חדש</Button>
            </div>
        );
    }

    return (
        <div className="buyer-form-card">
            <h1 className="buyer-form-title">טופס התקשרות עם רוכש</h1>

            {/* Main Selection Group */}
            <Box marginBottom={Context.MarginBottom}>
                <div className="input-label">פרויקט <span className="required-asterisk">*</span></div>
                <Dropdown
                    placeholder="בחר פרויקט"
                    options={projects}
                    onChange={handleProjectChange}
                    value={formData.projectId ? projects.find(p => p.value === formData.projectId) : null}
                    size={Dropdown.sizes.LARGE}
                    searchable
                    clearable={false}
                    menuPosition="absolute"
                    maxMenuHeight={250}
                />
            </Box>

            {formData.projectId && (
                <Box marginBottom={Context.MarginBottom}>
                    <div className="input-label">בניין <span className="required-asterisk">*</span></div>
                    <Dropdown
                        placeholder="בחר בניין"
                        options={buildings}
                        onChange={handleBuildingChange}
                        value={buildings.find(b => b.value === formData.buildingId)}
                        disabled={buildings.length === 0}
                        size={Dropdown.sizes.LARGE}
                        searchable
                        clearable={false}
                        menuPosition="absolute"
                        maxMenuHeight={250}
                    />
                </Box>
            )}

            {formData.buildingId && (
                <Box marginBottom={Context.MarginBottom}>
                    <div className="input-label">דירה <span className="required-asterisk">*</span></div>
                    <Dropdown
                        placeholder="בחר דירה"
                        options={apartments}
                        onChange={o => setFormData({ ...formData, apartmentId: o?.value })}
                        value={apartments.find(a => a.value === formData.apartmentId)}
                        disabled={apartments.length === 0}
                        size={Dropdown.sizes.LARGE}
                        searchable
                        clearable={false}
                        menuPosition="absolute"
                        maxMenuHeight={250}
                    />
                </Box>
            )}

            {/* Optional Fields Group - Vertical Stack */}
            {formData.projectId && (
                <div className="optional-fields-section">
                    <Box marginBottom={Context.MarginBottom}>
                        <div className="input-label">מחסן</div>
                        <Dropdown
                            placeholder="בחר מחסן"
                            options={storages}
                            onChange={o => setFormData({ ...formData, storageId: o?.value })}
                            value={storages.find(s => s.value === formData.storageId)}
                            disabled={storages.length === 0}
                            menuPosition="absolute"
                            maxMenuHeight={250}
                        />
                    </Box>

                    <Box marginBottom={Context.MarginBottom}>
                        <div className="input-label">חניה</div>
                        <Dropdown
                            placeholder="בחר חניה"
                            options={parkings}
                            onChange={o => setFormData({ ...formData, parkingId: o?.value })}
                            value={parkings.find(p => p.value === formData.parkingId)}
                            disabled={parkings.length === 0}
                            menuPosition="absolute"
                            maxMenuHeight={250}
                        />
                    </Box>

                    <Box marginBottom={Context.MarginBottom}>
                        <div className="input-label">יחידת מסחר</div>
                        <Dropdown
                            placeholder="בחר יח' מסחר"
                            options={commercials}
                            onChange={o => setFormData({ ...formData, commercialId: o?.value })}
                            value={commercials.find(c => c.value === formData.commercialId)}
                            disabled={commercials.length === 0}
                            menuPosition="absolute"
                            maxMenuHeight={250}
                        />
                    </Box>
                </div>
            )}

            <div style={{ borderTop: '1px solid #e1e1e1', margin: '24px 0' }}></div>

            {/* Buyers Table Section */}
            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>פרטי רוכשים</h3>
            <div className="buyers-table">
                {formData.buyers.map((buyer, index) => (
                    <Flex key={index} gap={Context.InputGap} style={{ marginBottom: '16px' }} align="end">
                        <Box flex={1}>
                            <div className="input-label-small">שם מלא {index === 0 && <span className="required-asterisk">*</span>}</div>
                            <TextField
                                placeholder="הכנס שם מלא"
                                value={buyer.fullName}
                                onChange={val => handleBuyerChange(index, 'fullName', val)}
                                size={TextField.sizes.MEDIUM}
                            />
                        </Box>
                        <Box flex={1}>
                            <div className="input-label-small">ת.ז. {index === 0 && <span className="required-asterisk">*</span>}</div>
                            <TextField
                                placeholder="מספר ת.זהות"
                                value={buyer.idNumber}
                                onChange={val => handleBuyerChange(index, 'idNumber', val)}
                                size={TextField.sizes.MEDIUM}
                            />
                        </Box>
                        <Box flex={1}>
                            <div className="input-label-small">טלפון</div>
                            <TextField
                                placeholder="050-0000000"
                                value={buyer.phone}
                                onChange={val => handleBuyerChange(index, 'phone', val)}
                                size={TextField.sizes.MEDIUM}
                            />
                        </Box>
                        <Box flex={1}>
                            <div className="input-label-small">אימייל</div>
                            <TextField
                                placeholder="mail@example.com"
                                value={buyer.email}
                                onChange={val => handleBuyerChange(index, 'email', val)}
                                size={TextField.sizes.MEDIUM}
                            />
                        </Box>
                    </Flex>
                ))}

                <Button
                    kind={Button.kinds.TERTIARY}
                    leftIcon={Add}
                    onClick={addBuyerRow}
                    style={{ marginTop: '8px' }}
                >
                    הוסף רוכש
                </Button>
            </div>


            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button onClick={handleSubmit} loading={submitting} size={Button.sizes.LARGE}>
                    שלח טופס
                </Button>
            </div>

        </div>
    );
};

export default BuyerForm;
