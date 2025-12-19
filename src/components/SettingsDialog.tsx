import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useSettings } from "../hooks/useSettings";
import RestartAltIcon from '@mui/icons-material/RestartAlt'

export type SettingsDialogProps = {
    open: boolean;
    onClose: () => void;
};

export function SettingsDialog(props: SettingsDialogProps) {
    const { settings, setSettings, resetArcPoints, DEFAULTS } = useSettings();
   
    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="sm">
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ pt: 1 }}>
                    <Stack spacing={1}>
                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle2">Points per 90° of arc</Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                    size="small"
                                    onClick={resetArcPoints}
                                    aria-label="Reset to default"
                                    disabled={settings.arcPointsPer90Deg === DEFAULTS.arcPointsPer90Deg}
                                >
                                    <RestartAltIcon fontSize="small" />
                                </IconButton>
                                <TextField
                                    type="number"
                                    value={settings.arcPointsPer90Deg}
                                    onChange={(e) => {
                                        const val = Number(e.target.value)
                                        if (Number.isFinite(val) && val > 0) {
                                            setSettings({ arcPointsPer90Deg: val })
                                        }
                                    }}
                                    size="small"
                                    inputProps={{ min: 1, step: 1 }}
                                    sx={{ width: 120 }}
                                />
                            </Stack>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            Default: {DEFAULTS.arcPointsPer90Deg}
                        </Typography>
                    </Stack>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}