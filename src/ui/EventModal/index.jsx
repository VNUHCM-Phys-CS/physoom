"use client";
import React, { useEffect } from "react";
import {
  Modal, Input, Button, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem
} from "@heroui/react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";

export default function EventModal({ data, isOpen, onOpenChange, onSave }) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { data: rooms } = useSWR("/api/room", fetcher);
  const { data: courses } = useSWR("/api/course", fetcher);

  const [formData, setFormData] = React.useState({
    title: "",
    type: "custom",
    status: "approved",
    start: "",
    end: "",
    room: "",
    course: "",
    teacher_email: ""
  });

  useEffect(() => {
    if (data) {
      // Format dates for html input type="datetime-local" (YYYY-MM-DDThh:mm)
      const formatDT = (d) => {
          if (!d) return "";
          const date = new Date(d);
          // adjust for timezone offset
          const offset = date.getTimezoneOffset() * 60000;
          return (new Date(date.getTime() - offset)).toISOString().slice(0, 16);
      };
      setFormData({
        title: data.title || "",
        type: data.type || "custom",
        status: data.status || "approved",
        start: formatDT(data.start),
        end: formatDT(data.end),
        room: data.room?._id || "",
        course: data.course?._id || "",
        teacher_email: Array.isArray(data.teacher_email) ? data.teacher_email.join(", ") : (data.teacher_email || "")
      });
    } else {
      setFormData({ title: "", type: "custom", status: "approved", start: "", end: "", room: "", course: "", teacher_email: "" });
    }
  }, [data]);

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      payload.teacher_email = payload.teacher_email.split(",").map(s => s.trim()).filter(Boolean);
      // Convert naive datetime-local strings to ISO on the client so the server
      // stores the user's local time rather than reinterpreting it as UTC.
      if (payload.start) payload.start = new Date(payload.start).toISOString();
      if (payload.end) payload.end = new Date(payload.end).toISOString();
      
      const method = data ? "PUT" : "POST";
      if (data) payload._id = data._id;

      const res = await fetch("/api/calendar-events", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        onSave();
        onOpenChange(false);
      } else {
        alert("Failed to save event");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside" size="2xl">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader><h3>{data ? "Edit Event" : "Create Event"}</h3></ModalHeader>
            <ModalBody className="flex border rounded p-4 gap-4">
               <Input 
                 label="Title" 
                 value={formData.title} 
                 onChange={e => setFormData({...formData, title: e.target.value})} 
                 isRequired 
               />
               <Select 
                 label="Type" 
                 selectedKeys={[formData.type]} 
                 onChange={e => setFormData({...formData, type: e.target.value})}
               >
                 <SelectItem key="class">Class</SelectItem>
                 <SelectItem key="holiday">Holiday</SelectItem>
                 <SelectItem key="term">Term</SelectItem>
                 <SelectItem key="exam">Exam</SelectItem>
                 <SelectItem key="custom">Custom</SelectItem>
               </Select>
               <Select 
                 label="Status" 
                 selectedKeys={[formData.status]} 
                 onChange={e => setFormData({...formData, status: e.target.value})}
               >
                 <SelectItem key="approved">Approved</SelectItem>
                 <SelectItem key="pending">Pending</SelectItem>
                 <SelectItem key="rejected">Rejected</SelectItem>
               </Select>
               
               <div className="flex gap-4">
                 <Input 
                   type="datetime-local" 
                   label="Start Time" 
                   value={formData.start} 
                   onChange={e => setFormData({...formData, start: e.target.value})} 
                   isRequired 
                 />
                 <Input 
                   type="datetime-local" 
                   label="End Time" 
                   value={formData.end} 
                   onChange={e => setFormData({...formData, end: e.target.value})} 
                   isRequired 
                 />
               </div>

               <Select 
                 label="Room (Optional)" 
                 selectedKeys={formData.room ? [formData.room] : []} 
                 onChange={e => setFormData({...formData, room: e.target.value})}
               >
                 {(rooms || []).map(r => <SelectItem key={r._id}>{r.title}</SelectItem>)}
               </Select>

               <Select 
                 label="Course (Optional)" 
                 selectedKeys={formData.course ? [formData.course] : []} 
                 onChange={e => setFormData({...formData, course: e.target.value})}
               >
                 {(courses || []).map(c => <SelectItem key={c._id}>{c.title}</SelectItem>)}
               </Select>

               <Input 
                 label="Teacher Email (Comma separated)" 
                 value={formData.teacher_email} 
                 onChange={e => setFormData({...formData, teacher_email: e.target.value})} 
               />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onClose}>Cancel</Button>
              <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>Save</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
