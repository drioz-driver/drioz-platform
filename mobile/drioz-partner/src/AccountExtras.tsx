import React, { useEffect, useState } from "react";
import { Text, View, Alert, Image } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {documentUploadDetails} from "./document-upload";
import { api } from "./api";
import { Banner, Button, Card, Choices, Field, colors, errorText, s } from "./ui";
import { languages, useLang, useT, type Lang } from "./i18n";

/** Language picker, mobile number, partner profile summary and self-service account deletion. */
export default function AccountExtras({ data, refresh, onDeleted }: { data: any; refresh: () => Promise<void>; onDeleted: () => Promise<void> }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const d = data.driver;
  const photo = data.documents?.find((x:any)=>x.kind==='profile_photo');
  const [photoUrl,setPhotoUrl] = useState<string|null>(null);
  useEffect(()=>{let active=true;setPhotoUrl(null);if(photo)api('driver/profile-photo').then(result=>{if(active)setPhotoUrl(result.url)}).catch(()=>{});return()=>{active=false}},[photo?.id]);
  function removePhoto(){Alert.alert('Delete profile picture?', 'Your picture will be removed from customer bookings.', [{text:'Keep picture',style:'cancel'},{text:'Delete picture',style:'destructive',onPress:()=>void run(async()=>{await api('driver/profile-photo/remove',{});setPhotoUrl(null);await refresh();setNotice('Profile picture removed.');})}]);}

  async function uploadPhoto(){await run(async()=>{const result=await DocumentPicker.getDocumentAsync({type:['image/jpeg','image/png'],copyToCacheDirectory:true,multiple:false});if(result.canceled)return;const file=result.assets?.[0];if(!file)throw Error('Choose a photo.');const details=documentUploadDetails(file);const form=new FormData();form.append('kind','profile_photo');if(file.file)form.append('file',file.file);else form.append('file',{uri:file.uri,...details} as any);await api('documents',form);await refresh();setNotice('Profile picture saved.');});}

  const [phone, setPhone] = useState(data.me.phone || d?.phone || "");
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <Text style={s.h3}>{t("acc.language")}</Text>
        <Choices value={lang} set={(v) => setLang(v as Lang)} values={languages} />
      </Card>
      {d ? (
        <Card>
          <Text style={s.h3}>{t("acc.profile")}</Text>
          <Text style={s.muted}>
            {d.verification === "approved" ? t("acc.verified") : d.verification} · {t("acc.licenceUntil", { date: d.licence_expiry })}
          </Text>
        </Card>
      ) : null}
      <Card>
        <Field label={t("acc.phone")} value={phone} onChange={setPhone} keyboard="phone-pad" placeholder="+919876543210" />
        <Button
          small
          secondary
          busy={busy && !deleting}
          disabled={!/^\+?[0-9\s-]{10,18}$/.test(phone)}
          title={t("acc.savePhone")}
          onPress={() =>
            run(async () => {
              await api("account/profile", { phone: phone.replace(/[\s-]/g, "") });
              await refresh();
              setNotice(t("acc.phoneSaved"));
            })
          }
        />
      </Card>
      <Card style={{ borderColor: deleting ? colors.danger : colors.line }}>
        <Text style={[s.h3, { color: colors.danger }]}>{t("acc.delete")}</Text>
        <Text style={s.muted}>{t("acc.deleteHint")}</Text>
        {deleting ? (
          <View style={{ gap: 6 }}>
      <Card><Text style={s.h2}>Profile picture</Text><Text style={s.muted}>Upload a clear front-facing photo. It appears automatically on customer bookings.</Text>{photoUrl&&<Image source={{uri:photoUrl}} style={{width:80,height:80,borderRadius:40}}/>}{photo&&<Button secondary disabled={busy} title="Delete profile picture" onPress={removePhoto}/>}<Button title="Add/change profile picture" disabled={busy||!d} onPress={uploadPhoto}/></Card>
            <Field label={t("acc.deleteType")} value={confirm} onChange={(v) => setConfirm(v.toUpperCase())} autoCapitalize="none" />
            <Button
              variant="danger"
              busy={busy}
              disabled={confirm !== "DELETE"}
              icon="trash-outline"
              title={t("acc.deleteConfirm")}
              onPress={() =>
                run(async () => {
                  await api("account/delete", { confirm: "DELETE" });
                  setNotice(t("acc.deleted"));
                  await onDeleted();
                })
              }
            />
            <Button small secondary title={t("common.cancel")} onPress={() => setDeleting(false)} />
          </View>
        ) : (
          <Button small variant="danger" icon="trash-outline" title={t("acc.delete")} onPress={() => setDeleting(true)} />
        )}
      </Card>
      {notice ? <Banner tone="good" text={notice} onClose={() => setNotice("")} /> : null}
      {error ? <Banner text={error} onClose={() => setError("")} /> : null}
    </>
  );
}
